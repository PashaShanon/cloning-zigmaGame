import config from "@colyseus/tools";
import { GameRoom } from "./rooms/GameRoom.js";

export default config({
    initializeGameServer: (gameServer) => {
        gameServer.define('game_room', GameRoom).filterBy(['roomCode']);
    },

    initializeExpress: (app) => {
        app.get("/status", (req, res) => {
            res.send("Server is running!");
        });
    }
});
