import { SynonymGeneratorService } from '../../../../services/synonym-generator';

/**
 * Adapter Synonym Service
 * Wraps the centralized SynonymGeneratorService for use inside agent tooling.
 */
export class SynonymServiceAdapter {
  name = 'synonym_service';
  description = 'Generate crypto-related synonym search queries and validate queries.';
  private svc: SynonymGeneratorService;

  constructor() {
    this.svc = new SynonymGeneratorService();
  }

  parameters = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['generateSynonyms', 'validateQuery'], description: 'Action to perform' },
      query: { type: 'string', description: 'Original user query' }
    },
    required: ['action', 'query']
  } as const;

  async execute({ action, query }: { action: 'generateSynonyms' | 'validateQuery'; query: string }) {
    switch (action) {
      case 'generateSynonyms':
        return await this.svc.generateSynonyms(query);
      case 'validateQuery':
        return await this.svc.validateCryptoQuery(query);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
