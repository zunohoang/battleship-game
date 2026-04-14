export interface ProfileSummaryDto {
  id: string;
  username: string;
  avatar: string | null;
  signature: string | null;
  elo: number;
  role: string;
}
