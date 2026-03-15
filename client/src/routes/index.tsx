import { createBrowserRouter, redirect } from "react-router-dom";
import { HomePage } from "@/pages/home";
import { WelcomePage } from "@/pages/welcome";
import { NotFound } from "@/pages/not-found";
import { GameSetupPage } from "@/pages/game-setup";
import { GamePlayPage } from "@/pages/game-play";
import { GameSetupProvider } from "@/store/gameSetupContext";

export const appRouter = createBrowserRouter([
    {
        path: "/",
        element: <WelcomePage />,
    },
    {
        path: "/home",
        element: <HomePage />,
    },
    {
        path: "/game/setup",
        element: (
            <GameSetupProvider>
                <GameSetupPage />
            </GameSetupProvider>
        ),
    },
    {
        path: "/game/play",
        element: <GamePlayPage />,
    },
    {
        path: "*",
        element: (
            <NotFound
                reset={() => {
                    throw redirect("/");
                }}
                error={new Error("Page not found")}
            />
        ),
    },
]);
