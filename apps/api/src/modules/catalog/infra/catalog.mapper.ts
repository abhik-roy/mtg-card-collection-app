import { CatalogCard } from '../domain/repositories/catalog.repository';
import { ScryfallCard } from '../../../shared/infra/http/scryfall.client';

export class CatalogMapper {
  static toDomain(card: ScryfallCard): CatalogCard {
    const imageSmall =
      card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small;
    const imageNormal =
      card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;

    const colorIdentity = card.color_identity?.map((symbol) => symbol.toUpperCase());
    const legalities = card.legalities ? { ...card.legalities } : undefined;

    return {
      id: card.id,
      name: card.name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      lang: card.lang,
      rarity: card.rarity,
      colorIdentity,
      typeLine: card.type_line,
      setType: card.set_type,
      releasedAt: card.released_at,
      manaValue: typeof card.cmc === 'number' ? card.cmc : undefined,
      legalities,
      imageSmall,
      imageNormal,
      usd: card.prices?.usd ? Number(card.prices.usd) : undefined,
      usdFoil: card.prices?.usd_foil ? Number(card.prices.usd_foil) : undefined,
    };
  }
}
