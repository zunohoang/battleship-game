type ShotMarkerResult = "hit" | "miss";

interface ShotMarkerProps {
    result: ShotMarkerResult;
}

export function ShotMarker({ result }: ShotMarkerProps) {
    return (
        <span
            className={`block h-[62%] w-[62%] rounded-full border-2 shadow-[0_6px_18px_rgba(0,0,0,0.12)] ${
                result === "hit"
                    ? "border-red-100 bg-[#d53333]"
                    : "border-[#dfe7ef] bg-white"
            }`}
        />
    );
}
