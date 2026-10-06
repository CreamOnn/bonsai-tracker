// Sheet layout. Each tab's first row is its header; the app maps columns by header name.
// See docs/SPEC.md section 3.

export const TABS: Record<string, string[]> = {
  Trees: ['id', 'species', 'style', 'origin_year', 'price_paid', 'source', 'notes', 'cover_photo_id', 'status', 'status_date', 'sale_price', 'created_at', 'p_sensitive'],
  // New columns go at the end so existing Sheets line up (missing headers are appended on load).
  Pots: ['id', 'maker_id', 'style', 'length_cm', 'width_cm', 'height_cm', 'origin_year', 'price', 'cover_photo_id', 'status', 'status_date', 'sale_price', 'created_at', 'glaze', 'glaze_colour', 'source', 'notes'],
  Makers: ['id', 'name', 'country'],
  Photos: ['id', 'owner_type', 'owner_id', 'drive_file_id', 'date', 'caption', 'created_at', 'thumb_file_id', 'slot'],
  CareLog: ['id', 'date', 'care_type', 'tree_id', 'notes', 'round_id', 'created_at', 'product', 'amount'],
  CareTypes: ['name', 'built_in', 'schedulable', 'active_months', 'uses_product'],
  Schedules: ['species', 'tree_id', 'care_type', 'interval_days', 'active_months'],
  Lists: ['list', 'value'],
  // Seasonal windows (SPEC §6b). species blank = care-type default. from/to are half-month codes, e.g. 09a.
  Windows: ['care_type', 'species', 'from', 'to', 'interval_days', 'product'],
  Meta: ['key', 'value'],
}

// Southern-hemisphere growing season, Sep–Apr. Blank = all year. Editable in Settings.
const GROWING_SEASON = '9,10,11,12,1,2,3,4'

const CARE_TYPES: [name: string, schedulable: boolean, activeMonths: string][] = [
  ['Prune', true, ''],
  ['Wire', true, ''],
  ['Unwire', false, ''],
  ['Repot', true, ''],
  ['Fertilise', true, GROWING_SEASON],
  ['Insecticide', true, ''],
  ['Fungicide', true, ''],
  ['Defoliate', false, ''],
  ['Outer-canopy defoliation', false, ''],
  ['Pinch', false, ''],
  ['Carved', false, ''],
  ['Lime sulfured', false, ''],
  ['Hard cut-back', false, ''],
  ['Water-check', false, ''],
]

const SPECIES = [
  'Acer buergerianum (Trident maple)',
  'Acer palmatum (Japanese maple)',
  'Buxus (Box)',
  'Callistemon (Bottlebrush)',
  'Carpinus turczaninowii (Korean hornbeam)',
  'Celtis sinensis (Chinese hackberry)',
  'Ficus microcarpa (Chinese banyan)',
  'Ficus rubiginosa (Port Jackson fig)',
  'Juniperus chinensis (Chinese juniper)',
  'Juniperus procumbens (Procumbens juniper)',
  'Lagerstroemia indica (Crepe myrtle)',
  'Larix (Larch)',
  'Malus (Crabapple)',
  'Melaleuca (Paperbark)',
  'Olea europaea (Olive)',
  'Pinus parviflora (Japanese white pine)',
  'Pinus thunbergii (Japanese black pine)',
  'Portulacaria afra (Dwarf jade)',
  'Rhododendron indicum (Satsuki azalea)',
  'Serissa foetida (Snow rose)',
  'Taxus cuspidata (Japanese yew)',
  'Ulmus parvifolia (Chinese elm)',
  'Wisteria',
  'Zelkova serrata (Japanese zelkova)',
]

const TREE_STYLES = [
  'Formal upright (Chokkan)',
  'Informal upright (Moyogi)',
  'Slanting (Shakan)',
  'Cascade (Kengai)',
  'Semi-cascade (Han-kengai)',
  'Literati (Bunjingi)',
  'Broom (Hokidachi)',
  'Windswept (Fukinagashi)',
  'Twin trunk (Sokan)',
  'Multi-trunk (Kabudachi)',
  'Forest (Yose-ue)',
  'Raft (Ikadabuki)',
  'Root over rock (Sekijoju)',
  'Exposed root (Neagari)',
]

const POT_STYLES = [
  'Rectangle',
  'Oval',
  'Round',
  'Square',
  'Drum',
  'Hexagonal',
  'Octagonal',
  'Lotus',
  'Crescent',
  'Nanban',
  'Slab',
  'Cascade',
  'Semi-cascade',
]

const GLAZE_COLOURS = [
  'Celadon',
  'Nama',
  'Shino',
  'Tenmoku',
  'Ivory',
  'Cobalt blue',
  'Oribe green',
  'Namako',
  'Kinyo',
  'Brown clay',
  'Grey clay',
  'Red clay',
  'Black clay',
]

const COUNTRIES = ['Japan', 'China', 'Australia', 'United Kingdom', 'United States', 'Korea', 'Germany', 'Czech Republic', 'Taiwan']

// Proteaceae: Australian/South African natives that need low-phosphorus fertiliser (SPEC §6a).
export const P_SENSITIVE_SEED = ['Banksia', 'Grevillea', 'Hakea', 'Leucadendron', 'Macadamia']

/**
 * Starter values per list. A list missing from an existing Sheet is seeded on load.
 * `p_sensitive` holds species names flagged as phosphorus-sensitive.
 */
export const LIST_SEEDS: Record<string, string[]> = {
  species: [...SPECIES, ...P_SENSITIVE_SEED].sort((a, b) => a.localeCompare(b)),
  tree_style: TREE_STYLES,
  pot_style: POT_STYLES,
  glaze_colour: GLAZE_COLOURS,
  country: COUNTRIES,
  p_sensitive: P_SENSITIVE_SEED,
}

export function seedRows(schemaVersion: number): Record<string, string[][]> {
  return {
    CareTypes: CARE_TYPES.map(([name, sched, months]) => [name, 'y', sched ? 'y' : 'n', months]),
    Lists: Object.entries(LIST_SEEDS).flatMap(([list, values]) => values.map((v) => [list, v])),
    Meta: [
      ['schema_version', String(schemaVersion)],
      ['created_at', new Date().toISOString()],
    ],
  }
}
