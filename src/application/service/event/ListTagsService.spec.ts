import { ListTagsService } from './ListTagsService';

const mockFindTag = { findAll: jest.fn(), findByNames: jest.fn() };

describe('ListTagsService', () => {
  let service: ListTagsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ListTagsService(mockFindTag);
  });

  it('回傳所有標籤', async () => {
    mockFindTag.findAll.mockResolvedValue([
      { id: 'tag-1', name: 'music' },
      { id: 'tag-2', name: 'sport' },
    ]);

    const result = await service.execute();

    expect(result.tags).toHaveLength(2);
    expect(result.tags[0].name).toBe('music');
  });

  it('無標籤時回傳空陣列', async () => {
    mockFindTag.findAll.mockResolvedValue([]);

    const result = await service.execute();

    expect(result.tags).toHaveLength(0);
  });
});
