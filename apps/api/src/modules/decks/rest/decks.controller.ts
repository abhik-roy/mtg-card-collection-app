import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DecksService } from '../decks.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { DeckIdParamDto } from './dto/deck-id.dto';

@UseGuards(JwtAuthGuard)
@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateDeckDto) {
    const deck = await this.decksService.create({
      userId: user.id,
      name: payload.name,
      format: payload.format,
      description: payload.description,
      cards: payload.cards,
    });

    return this.toResponse(deck);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const decks = await this.decksService.list(user.id);
    return {
      items: decks.map((deck) => this.toResponse(deck)),
    };
  }

  @Get(':id')
  async getById(@CurrentUser() user: AuthenticatedUser, @Param() params: DeckIdParamDto) {
    const deck = await this.decksService.getById(user.id, params.id);
    return this.toResponse(deck);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DeckIdParamDto,
    @Body() payload: UpdateDeckDto,
  ) {
    const deck = await this.decksService.update({
      userId: user.id,
      deckId: params.id,
      name: payload.name,
      format: payload.format === null ? null : payload.format ?? undefined,
      description: payload.description === null ? null : payload.description ?? undefined,
      cards: payload.cards,
    });

    return this.toResponse(deck);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param() params: DeckIdParamDto) {
    await this.decksService.delete(user.id, params.id);
    return { ok: true };
  }

  @Get(':id/compare')
  async compare(@CurrentUser() user: AuthenticatedUser, @Param() params: DeckIdParamDto) {
    const comparison = await this.decksService.compare(user.id, params.id);
    return comparison;
  }

  private toResponse(deck: any) {
    return {
      id: deck.id,
      name: deck.name,
      format: deck.format,
      description: deck.description,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      cards: deck.cards.map((card: any) => ({
        id: card.id,
        cardId: card.cardId,
        quantity: card.quantity,
        board: card.board,
      })),
    };
  }
}
