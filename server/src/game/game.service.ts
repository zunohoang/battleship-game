import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MatchEntity } from './infrastructure/persistence/relational/entities/match.entity';
import { MoveEntity } from './infrastructure/persistence/relational/entities/move.entity';
import { RoomEntity } from './infrastructure/persistence/relational/entities/room.entity';
import type {
  BoardConfig,
  MatchSnapshot,
  Orientation,
  PlacedShip,
  RoomSnapshot,
  ShipDefinition,
  ShotRecord,
} from './types/game.types';
import { CreateRoomDto, MoveDto, RoomReadyDto } from './dto/game-events.dto';

const SETUP_WINDOW_MS = 60 * 1000;
const RANDOM_PLACEMENT_MAX_ATTEMPTS = 300;

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

function makeRoomCode(): string {
  const source = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += source[Math.floor(Math.random() * source.length)];
  }
  return code;
}

function shipCells(
  ship: PlacedShip,
  size: number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < size; i += 1) {
    out.push({
      x: ship.x + (ship.orientation === 'horizontal' ? i : 0),
      y: ship.y + (ship.orientation === 'vertical' ? i : 0),
    });
  }
  return out;
}

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepo: Repository<RoomEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,
    @InjectRepository(MoveEntity)
    private readonly moveRepo: Repository<MoveEntity>,
  ) {}

  async createRoom(
    userId: string,
    payload: CreateRoomDto,
  ): Promise<RoomSnapshot> {
    const code = await this.createUniqueRoomCode();
    const room = this.roomRepo.create({
      id: randomUUID(),
      code,
      status: 'waiting',
      visibility: payload.visibility ?? 'public',
      ownerId: userId,
      guestId: null,
      ownerReady: false,
      guestReady: false,
      currentMatchId: null,
      expiresAt: null,
    });
    const savedRoom = await this.roomRepo.save(room);
    return this.toRoomSnapshot(savedRoom);
  }

  async listOpenRooms(): Promise<RoomSnapshot[]> {
    const rooms = await this.roomRepo.find({
      where: {
        status: 'waiting',
        visibility: 'public',
      },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    return rooms.map((room) => this.toRoomSnapshot(room));
  }

  async joinRoom(
    userId: string,
    options: { roomCode?: string },
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    let room: RoomEntity | null = null;

    if (options.roomCode) {
      room = await this.roomRepo.findOne({
        where: { code: options.roomCode.toUpperCase() },
      });
    } else {
      room = await this.roomRepo.findOne({
        where: {
          status: 'waiting',
          visibility: 'public',
        },
        order: { createdAt: 'ASC' },
      });
    }

    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    if (room.ownerId === userId) {
      const existing = room.currentMatchId
        ? await this.matchRepo.findOne({ where: { id: room.currentMatchId } })
        : null;

      if (existing) {
        return {
          room: this.toRoomSnapshot(room),
          match: this.toMatchSnapshot(existing),
        };
      }

      throw new BadRequestException({
        error: 'ROOM_NEEDS_OPPONENT',
        message: 'Room has no opponent yet',
      });
    }

    if (room.guestId && room.guestId !== userId) {
      throw new BadRequestException({
        error: 'ROOM_FULL',
        message: 'Room is full',
      });
    }

    room.guestId = userId;
    room.status = 'waiting';

    const match = room.currentMatchId
      ? await this.matchRepo.findOne({ where: { id: room.currentMatchId } })
      : null;

    if (!match) {
      throw new BadRequestException({
        error: 'ROOM_SETUP_MISSING',
        message: 'Room setup is not initialized',
      });
    }

    match.player2Id = userId;
    match.updatedAt = new Date();

    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async initializeMatch(
    roomId: string,
    ownerId: string,
    boardConfig: BoardConfig,
    ships: ShipDefinition[],
  ): Promise<MatchSnapshot> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    if (room.ownerId !== ownerId) {
      throw new BadRequestException({
        error: 'ROOM_OWNER_ONLY',
        message: 'Only room owner can initialize match',
      });
    }

    if (room.currentMatchId) {
      const existing = await this.matchRepo.findOne({
        where: { id: room.currentMatchId },
      });
      if (existing) {
        return this.toMatchSnapshot(existing);
      }
    }

    const match = this.matchRepo.create({
      id: randomUUID(),
      roomId,
      status: 'setup',
      boardConfig,
      ships,
      player1Id: ownerId,
      player2Id: room.guestId ?? ownerId,
      player1Placements: null,
      player2Placements: null,
      player1Shots: [],
      player2Shots: [],
      turnPlayerId: null,
      winnerId: null,
      setupDeadlineAt: null,
      version: 0,
      rematchVotes: {},
    });

    const savedMatch = await this.matchRepo.save(match);
    room.currentMatchId = savedMatch.id;
    await this.roomRepo.save(room);
    return this.toMatchSnapshot(savedMatch);
  }

  async startRoom(
    roomId: string,
    userId: string,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);

    if (userId !== room.ownerId) {
      throw new BadRequestException({
        error: 'ROOM_OWNER_ONLY',
        message: 'Only room owner can start setup',
      });
    }

    if (!room.guestId) {
      throw new BadRequestException({
        error: 'ROOM_NEEDS_OPPONENT',
        message: 'Room has no opponent yet',
      });
    }

    if (match.status !== 'setup') {
      throw new BadRequestException({
        error: 'MATCH_INVALID_STATE',
        message: 'Match setup already finished',
      });
    }

    room.status = 'setup';
    room.ownerReady = false;
    room.guestReady = false;

    match.player2Id = room.guestId;
    match.setupDeadlineAt = new Date(Date.now() + SETUP_WINDOW_MS);
    match.version += 1;

    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async markReady(
    roomId: string,
    userId: string,
    payload: RoomReadyDto,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);

    if (room.status !== 'setup' || match.status !== 'setup') {
      throw new BadRequestException({
        error: 'ROOM_NOT_IN_SETUP',
        message: 'Room is not in setup phase',
      });
    }

    if (this.isSetupExpired(match)) {
      this.forceStartAfterSetupTimeout(room, match);
      const [savedRoom, savedMatch] = await Promise.all([
        this.roomRepo.save(room),
        this.matchRepo.save(match),
      ]);
      return {
        room: this.toRoomSnapshot(savedRoom),
        match: this.toMatchSnapshot(savedMatch),
      };
    }

    const placements = payload.placements as PlacedShip[];

    this.validatePlacements(match.boardConfig, match.ships, placements);

    if (match.player1Id === userId) {
      match.player1Placements = placements;
      room.ownerReady = true;
    } else if (match.player2Id === userId) {
      match.player2Placements = placements;
      room.guestReady = true;
    } else {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    if (room.ownerReady && room.guestReady) {
      match.status = 'in_progress';
      room.status = 'in_game';
      match.turnPlayerId = match.player1Id;
      match.setupDeadlineAt = null;
    }

    match.version += 1;
    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async submitMove(userId: string, payload: MoveDto): Promise<MatchSnapshot> {
    const match = await this.matchRepo.findOne({
      where: { id: payload.matchId },
    });
    if (!match) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Match not found',
      });
    }

    if (match.status !== 'in_progress') {
      throw new BadRequestException({
        error: 'MATCH_NOT_ACTIVE',
        message: 'Match is not active',
      });
    }

    if (match.turnPlayerId !== userId) {
      throw new BadRequestException({
        error: 'NOT_YOUR_TURN',
        message: 'Not your turn',
      });
    }

    if (
      payload.x < 0 ||
      payload.y < 0 ||
      payload.x >= match.boardConfig.cols ||
      payload.y >= match.boardConfig.rows
    ) {
      throw new BadRequestException({
        error: 'INVALID_COORDINATE',
        message: 'Coordinate is outside board',
      });
    }

    const attackerShots =
      userId === match.player1Id ? match.player1Shots : match.player2Shots;
    if (
      attackerShots.some((shot) => shot.x === payload.x && shot.y === payload.y)
    ) {
      throw new BadRequestException({
        error: 'CELL_ALREADY_SHOT',
        message: 'Cell already targeted',
      });
    }

    const opponentPlacements =
      userId === match.player1Id
        ? match.player2Placements
        : match.player1Placements;
    const hitSet = this.placementHitSet(match.ships, opponentPlacements ?? []);
    const shotHit = hitSet.has(keyOf(payload.x, payload.y));
    const nextSequence = attackerShots.length + 1;
    const clientMoveId =
      payload.clientMoveId?.trim() ||
      `${userId}:${payload.x}:${payload.y}:${nextSequence}`;

    const shotRecord: ShotRecord = {
      x: payload.x,
      y: payload.y,
      isHit: shotHit,
      at: new Date().toISOString(),
      by: userId,
      sequence: nextSequence,
      clientMoveId,
    };

    if (userId === match.player1Id) {
      match.player1Shots = [...match.player1Shots, shotRecord];
    } else {
      match.player2Shots = [...match.player2Shots, shotRecord];
    }

    const destroyed = this.checkFleetDestroyed(
      match.ships,
      opponentPlacements ?? [],
      userId === match.player1Id ? match.player1Shots : match.player2Shots,
    );

    if (destroyed) {
      match.status = 'finished';
      match.winnerId = userId;
      match.turnPlayerId = null;
      await this.markRoomFinished(match.roomId);
    } else {
      match.turnPlayerId =
        userId === match.player1Id ? match.player2Id : match.player1Id;
    }

    match.version += 1;

    await Promise.all([
      this.matchRepo.save(match),
      this.moveRepo.save(
        this.moveRepo.create({
          id: randomUUID(),
          matchId: match.id,
          playerId: userId,
          x: payload.x,
          y: payload.y,
          isHit: shotHit,
          sequence: nextSequence,
          clientMoveId,
        }),
      ),
    ]);

    return this.toMatchSnapshot(match);
  }

  async forfeit(roomId: string, userId: string): Promise<MatchSnapshot> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);
    if (match.status === 'finished') {
      return this.toMatchSnapshot(match);
    }

    if (userId !== match.player1Id && userId !== match.player2Id) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    match.status = 'finished';
    match.winnerId =
      userId === match.player1Id ? match.player2Id : match.player1Id;
    match.turnPlayerId = null;
    match.version += 1;

    room.status = 'finished';
    room.ownerReady = false;
    room.guestReady = false;

    const [savedMatch] = await Promise.all([
      this.matchRepo.save(match),
      this.roomRepo.save(room),
    ]);
    return this.toMatchSnapshot(savedMatch);
  }

  async rematchVote(
    roomId: string,
    userId: string,
    accept: boolean,
  ): Promise<{
    room: RoomSnapshot;
    match: MatchSnapshot;
  }> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);

    if (match.status !== 'finished') {
      throw new BadRequestException({
        error: 'MATCH_NOT_FINISHED',
        message: 'Rematch is only available after match finished',
      });
    }

    if (userId !== match.player1Id && userId !== match.player2Id) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    match.rematchVotes = {
      ...match.rematchVotes,
      [userId]: accept,
    };
    match.version += 1;

    const bothAccepted =
      match.rematchVotes[match.player1Id] === true &&
      match.rematchVotes[match.player2Id] === true;

    if (bothAccepted) {
      const nextMatch = this.matchRepo.create({
        id: randomUUID(),
        roomId: room.id,
        status: 'setup',
        boardConfig: match.boardConfig,
        ships: match.ships,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        player1Placements: null,
        player2Placements: null,
        player1Shots: [],
        player2Shots: [],
        turnPlayerId: null,
        winnerId: null,
        setupDeadlineAt: null,
        version: 0,
        rematchVotes: {},
      });
      const savedNext = await this.matchRepo.save(nextMatch);
      room.currentMatchId = savedNext.id;
      room.status = 'setup';
      room.ownerReady = false;
      room.guestReady = false;
      const savedRoom = await this.roomRepo.save(room);

      return {
        room: this.toRoomSnapshot(savedRoom),
        match: this.toMatchSnapshot(savedNext),
      };
    }

    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async leaveRoom(roomId: string, userId: string): Promise<RoomSnapshot> {
    const room = await this.getRoomOrThrow(roomId);

    if (room.ownerId === userId) {
      room.status = 'closed';
      room.expiresAt = new Date();
    } else if (room.guestId === userId) {
      room.guestId = null;
      room.guestReady = false;
      room.status = 'waiting';
    } else {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    const saved = await this.roomRepo.save(room);
    return this.toRoomSnapshot(saved);
  }

  async getRoomState(
    roomId: string,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot | null }> {
    const room = await this.getRoomOrThrow(roomId);
    let match = room.currentMatchId
      ? await this.matchRepo.findOne({ where: { id: room.currentMatchId } })
      : null;

    if (match && room.status === 'setup' && match.status === 'setup') {
      if (this.isSetupExpired(match)) {
        this.forceStartAfterSetupTimeout(room, match);
        const [savedRoom, savedMatch] = await Promise.all([
          this.roomRepo.save(room),
          this.matchRepo.save(match),
        ]);
        return {
          room: this.toRoomSnapshot(savedRoom),
          match: this.toMatchSnapshot(savedMatch),
        };
      }
    }

    return {
      room: this.toRoomSnapshot(room),
      match: match ? this.toMatchSnapshot(match) : null,
    };
  }

  async reconnect(
    userId: string,
    params: { roomId?: string; matchId?: string },
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    let room: RoomEntity | null = null;
    let match: MatchEntity | null = null;

    if (params.roomId) {
      room = await this.roomRepo.findOne({ where: { id: params.roomId } });
    }

    if (!room && params.matchId) {
      match = await this.matchRepo.findOne({ where: { id: params.matchId } });
      if (match) {
        room = await this.roomRepo.findOne({ where: { id: match.roomId } });
      }
    }

    if (!room) {
      room = await this.roomRepo.findOne({
        where: [{ ownerId: userId }, { guestId: userId }],
        order: { updatedAt: 'DESC' },
      });
    }

    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'No room to reconnect',
      });
    }

    if (!match) {
      match = await this.getCurrentMatchOrThrow(room);
    }

    if (room.status === 'setup' && match.status === 'setup' && this.isSetupExpired(match)) {
      this.forceStartAfterSetupTimeout(room, match);
      [room, match] = await Promise.all([
        this.roomRepo.save(room),
        this.matchRepo.save(match),
      ]);
    }

    if (
      userId !== room.ownerId &&
      userId !== room.guestId &&
      userId !== match.player1Id &&
      userId !== match.player2Id
    ) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    return {
      room: this.toRoomSnapshot(room),
      match: this.toMatchSnapshot(match),
    };
  }

  private async markRoomFinished(roomId: string): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) return;
    room.status = 'finished';
    room.ownerReady = false;
    room.guestReady = false;
    await this.roomRepo.save(room);
  }

  private async createUniqueRoomCode(): Promise<string> {
    for (let i = 0; i < 10; i += 1) {
      const code = makeRoomCode();
      const existing = await this.roomRepo.findOne({ where: { code } });
      if (!existing) {
        return code;
      }
    }
    throw new BadRequestException({
      error: 'ROOM_CODE_UNAVAILABLE',
      message: 'Could not allocate room code',
    });
  }

  private async getRoomOrThrow(roomId: string): Promise<RoomEntity> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }
    return room;
  }

  private async getCurrentMatchOrThrow(room: RoomEntity): Promise<MatchEntity> {
    if (!room.currentMatchId) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Room has no active match',
      });
    }

    const match = await this.matchRepo.findOne({
      where: { id: room.currentMatchId },
    });
    if (!match) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Match not found',
      });
    }
    return match;
  }

  private validatePlacements(
    board: BoardConfig,
    ships: ShipDefinition[],
    placements: PlacedShip[],
  ): void {
    const shipMap = new Map(ships.map((ship) => [ship.id, ship]));
    const usedCells = new Set<string>();
    const counters = new Map<string, number>();

    for (const placement of placements) {
      const ship = shipMap.get(placement.definitionId);
      if (!ship) {
        throw new BadRequestException({
          error: 'INVALID_SHIP_DEFINITION',
          message: 'Placement references unknown ship',
        });
      }

      counters.set(
        placement.definitionId,
        (counters.get(placement.definitionId) ?? 0) + 1,
      );

      for (const cell of shipCells(placement, ship.size)) {
        if (
          cell.x < 0 ||
          cell.y < 0 ||
          cell.x >= board.cols ||
          cell.y >= board.rows
        ) {
          throw new BadRequestException({
            error: 'PLACEMENT_OUT_OF_BOUNDS',
            message: 'Placement is outside board',
          });
        }

        const key = keyOf(cell.x, cell.y);
        if (usedCells.has(key)) {
          throw new BadRequestException({
            error: 'PLACEMENT_COLLISION',
            message: 'Placement overlap detected',
          });
        }
        usedCells.add(key);
      }
    }

    for (const ship of ships) {
      const expected = ship.count;
      const actual = counters.get(ship.id) ?? 0;
      if (actual !== expected) {
        throw new BadRequestException({
          error: 'PLACEMENT_COUNT_MISMATCH',
          message: 'Ship count mismatch',
        });
      }
    }
  }

  private placementHitSet(
    ships: ShipDefinition[],
    placements: PlacedShip[],
  ): Set<string> {
    const shipMap = new Map(ships.map((ship) => [ship.id, ship]));
    const hitSet = new Set<string>();
    for (const placement of placements) {
      const ship = shipMap.get(placement.definitionId);
      if (!ship) continue;
      for (const cell of shipCells(placement, ship.size)) {
        hitSet.add(keyOf(cell.x, cell.y));
      }
    }
    return hitSet;
  }

  private checkFleetDestroyed(
    ships: ShipDefinition[],
    placements: PlacedShip[],
    shots: ShotRecord[],
  ): boolean {
    const shotSet = new Set(
      shots.filter((shot) => shot.isHit).map((shot) => keyOf(shot.x, shot.y)),
    );
    const shipMap = new Map(ships.map((ship) => [ship.id, ship]));
    for (const placement of placements) {
      const ship = shipMap.get(placement.definitionId);
      if (!ship) continue;
      for (const cell of shipCells(placement, ship.size)) {
        if (!shotSet.has(keyOf(cell.x, cell.y))) {
          return false;
        }
      }
    }
    return placements.length > 0;
  }

  private toRoomSnapshot(room: RoomEntity): RoomSnapshot {
    return {
      roomId: room.id,
      roomCode: room.code,
      visibility: room.visibility,
      status: room.status,
      ownerId: room.ownerId,
      guestId: room.guestId,
      currentMatchId: room.currentMatchId,
      ownerReady: room.ownerReady,
      guestReady: room.guestReady,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }

  private toMatchSnapshot(match: MatchEntity): MatchSnapshot {
    return {
      id: match.id,
      roomId: match.roomId,
      status: match.status,
      boardConfig: match.boardConfig,
      ships: match.ships,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1Placements: match.player1Placements,
      player2Placements: match.player2Placements,
      player1Shots: match.player1Shots,
      player2Shots: match.player2Shots,
      turnPlayerId: match.turnPlayerId,
      winnerId: match.winnerId,
      setupDeadlineAt: match.setupDeadlineAt
        ? match.setupDeadlineAt.toISOString()
        : null,
      version: match.version,
      rematchVotes: match.rematchVotes,
      updatedAt: match.updatedAt.toISOString(),
    };
  }

  private isSetupExpired(match: MatchEntity): boolean {
    if (!match.setupDeadlineAt) {
      return false;
    }

    return Date.now() >= match.setupDeadlineAt.getTime();
  }

  private forceStartAfterSetupTimeout(room: RoomEntity, match: MatchEntity): void {
    if (!match.player1Placements) {
      match.player1Placements = this.generateRandomPlacements(
        match.boardConfig,
        match.ships,
      );
      room.ownerReady = true;
    }

    if (!match.player2Placements) {
      match.player2Placements = this.generateRandomPlacements(
        match.boardConfig,
        match.ships,
      );
      room.guestReady = true;
    }

    room.status = 'in_game';
    match.status = 'in_progress';
    match.turnPlayerId = match.player1Id;
    match.setupDeadlineAt = null;
    match.version += 1;
  }

  private generateRandomPlacements(
    board: BoardConfig,
    ships: ShipDefinition[],
  ): PlacedShip[] {
    const placements: PlacedShip[] = [];
    const occupied = new Set<string>();

    for (const ship of ships) {
      for (let instanceIndex = 0; instanceIndex < ship.count; instanceIndex += 1) {
        let placed = false;

        for (let attempt = 0; attempt < RANDOM_PLACEMENT_MAX_ATTEMPTS; attempt += 1) {
          const orientation: Orientation =
            Math.random() > 0.5 ? 'horizontal' : 'vertical';
          const maxX =
            orientation === 'horizontal' ? board.cols - ship.size : board.cols - 1;
          const maxY =
            orientation === 'vertical' ? board.rows - ship.size : board.rows - 1;
          const x = Math.floor(Math.random() * (maxX + 1));
          const y = Math.floor(Math.random() * (maxY + 1));

          const candidate: PlacedShip = {
            definitionId: ship.id,
            instanceIndex,
            x,
            y,
            orientation,
          };

          const cells = shipCells(candidate, ship.size);
          const blocked = cells.some((cell) => occupied.has(keyOf(cell.x, cell.y)));
          if (blocked) {
            continue;
          }

          placements.push(candidate);
          for (const cell of cells) {
            occupied.add(keyOf(cell.x, cell.y));
          }
          placed = true;
          break;
        }

        if (!placed) {
          throw new BadRequestException({
            error: 'AUTO_PLACEMENT_FAILED',
            message: 'Could not auto place ships in setup timeout',
          });
        }
      }
    }

    return placements;
  }
}
