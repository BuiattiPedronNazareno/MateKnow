import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
    },
    namespace: 'ranking',
    transports: ['websocket', 'polling'],
})
export class RankingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(RankingGateway.name);

    afterInit(server: Server) {
        this.logger.log('✅ Ranking WebSocket Server initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to ranking: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from ranking: ${client.id}`);
    }

    emitRankingUpdate(data: any) {
        this.logger.log(`Emitting ranking update: ${JSON.stringify(data)}`);
        this.server.emit('ranking_update', data);
    }
}
