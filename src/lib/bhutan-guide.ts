import type { GuidePathId } from "./catalog";

/**
 * Curated Bhutan guide data for the BI Tree explore experience.
 *
 * Every entry is real and sourced. Places carry a source_url; photos come
 * from Wikimedia Commons with their license recorded in image_credit.
 * Restaurants carry no photo: no freely licensed photos exist for these
 * specific businesses, and we do not invent imagery.
 *
 * Facts were collected from Wikivoyage city guides (Thimphu, Paro, Punakha)
 * and Wikipedia, verified 2026-11-14. Restaurant hours and prices change;
 * treat listings as pointers, not guarantees.
 */

export type PlaceKind = "restaurant" | "temple" | "heritage" | "nature";

export interface GuidePlace {
  id: string;
  kind: PlaceKind;
  /** Guide path this place belongs to (1-4). */
  path: GuidePathId;
  name: string;
  region: string;
  blurb: string;
  image_url: string | null;
  image_credit: string | null;
  source_url: string;
  source_label: string;
}

export interface GuideFolktale {
  id: string;
  path: 4;
  title: string;
  tradition: string;
  story: string;
  moral: string;
  image_url: string;
  image_credit: string;
  source_url: string;
  source_label: string;
}

export const guidePathForKind: Record<PlaceKind, GuidePathId> = {
  temple: 1,
  nature: 2,
  restaurant: 3,
  heritage: 4,
};

export const GUIDE_TIP =
  "Most restaurants in Thimphu stop serving between 20:30 and 21:30 — plan dinner early.";

const WIKIVOYAGE_THIMPHU = "https://en.wikivoyage.org/wiki/Thimphu#Eat";
const WIKIVOYAGE_PARO = "https://en.wikivoyage.org/wiki/Paro#Eat";
const WIKIVOYAGE_PUNAKHA = "https://en.wikivoyage.org/wiki/Punakha#Eat";

export const bhutanPlaces: GuidePlace[] = [
  {
    id: "taktsang",
    kind: "temple",
    path: 1,
    name: "Paro Taktsang (Tiger's Nest)",
    region: "Paro",
    blurb:
      "Bhutan's best-known monastery, clinging to a cliff above the Paro Valley where Guru Rinpoche is said to have meditated in the 8th century. About a 2–3 hour uphill hike from the parking lot.",
    image_url:
      "/images/bhutan/taktsang-monastery.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Paro_Taktsang",
    source_label: "Wikipedia: Paro Taktsang",
  },
  {
    id: "kyichu",
    kind: "temple",
    path: 1,
    name: "Kyichu Lhakhang",
    region: "Paro",
    blurb:
      "One of the 108 temples said to have been built overnight by King Songtsen Gampo in the 7th century to subdue a demoness and plant Buddhism across the Himalayas.",
    image_url:
      "/images/bhutan/kyichu-lhakhang.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY 2.5",
    source_url: "https://en.wikipedia.org/wiki/Kyichu_Lhakhang",
    source_label: "Wikipedia: Kyichu Lhakhang",
  },
  {
    id: "jambay",
    kind: "temple",
    path: 1,
    name: "Jambay Lhakhang",
    region: "Bumthang",
    blurb:
      "Among the oldest surviving temples in Bhutan, part of the 7th-century circuit attributed to King Songtsen Gampo. Famous for the annual fire ceremony (Mewang) held inside its walls.",
    image_url:
      "/images/bhutan/jambay-lhakhang.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Jampa_Lhakhang",
    source_label: "Wikipedia: Jampa (Jambay) Lhakhang",
  },
  {
    id: "chimi",
    kind: "temple",
    path: 1,
    name: "Chimi Lhakhang",
    region: "Punakha",
    blurb:
      "The “fertility temple” founded by the Divine Madman, Drukpa Kunley; marked by painted wooden phalluses and thrumming with visitors seeking a blessing for children.",
    image_url:
      "/images/bhutan/chimi-lhakhang.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Chimi_Lhakhang",
    source_label: "Wikipedia: Chimi Lhakhang",
  },
  {
    id: "changangkha",
    kind: "temple",
    path: 1,
    name: "Changangkha Lhakhang",
    region: "Thimphu",
    blurb:
      "A hilltop temple dating to the 15th century above Thimphu; a cherished place for naming newborns, visited by locals for generations.",
    image_url:
      "/images/bhutan/changangkha-lhakhang.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Changangkha_Lhakhang",
    source_label: "Wikipedia: Changangkha Lhakhang",
  },
  {
    id: "memorial-chorten",
    kind: "temple",
    path: 1,
    name: "National Memorial Chorten",
    region: "Thimphu",
    blurb:
      "Built in 1974 in memory of the third king, Jigme Dorji Wangchuck. Residents circumambulate it daily with prayer wheels; inside, superb tanka paintings depict the stages to enlightenment.",
    image_url:
      "/images/bhutan/thimphu-chorten.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/National_Memorial_Chorten",
    source_label: "Wikipedia: National Memorial Chorten",
  },
  {
    id: "dordenma",
    kind: "temple",
    path: 1,
    name: "Buddha Dordenma",
    region: "Thimphu",
    blurb:
      "A 51.5-metre bronze Buddha high above the Thimphu Valley, completed in 2015; one of the largest seated Buddha statues in the world. Popular at sunset.",
    image_url:
      "/images/bhutan/buddha-dordenma.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikivoyage.org/wiki/Thimphu#Do",
    source_label: "Wikivoyage: Thimphu",
  },
  {
    id: "simtokha",
    kind: "temple",
    path: 1,
    name: "Simtokha Dzong",
    region: "Thimphu",
    blurb:
      "Bhutan’s first dzong, built in 1629 by Zhabdrung Ngawang Namgyal. Today it houses the National Institute for Zorig Chusum, preserving the 13 traditional arts and crafts.",
    image_url:
      "/images/bhutan/simtokha-dzong.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Simtokha_Dzong",
    source_label: "Wikipedia: Simtokha Dzong",
  },
  {
    id: "punakha-dzong",
    kind: "heritage",
    path: 4,
    name: "Punakha Dzong",
    region: "Punakha",
    blurb:
      "Raised without nails at the confluence of the Pho Chhu and Mo Chhu rivers; Bhutan’s government seat until 1955 and winter home of the monastic body.",
    image_url:
      "/images/bhutan/punakha-dzong.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Punakha_Dzong",
    source_label: "Wikipedia: Punakha Dzong",
  },
  {
    id: "tashichho",
    kind: "heritage",
    path: 4,
    name: "Tashichho Dzong",
    region: "Thimphu",
    blurb:
      "Seat of the Bhutanese government, its massive white walls and golden spires dominating the Thimphu riverbank. The throne room hosts the annual National Day celebrations.",
    image_url:
      "/images/bhutan/tashichho-dzong.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Tashichho_Dzong",
    source_label: "Wikipedia: Tashichho Dzong",
  },
  {
    id: "rinpung",
    kind: "heritage",
    path: 4,
    name: "Rinpung Dzong",
    region: "Paro",
    blurb:
      "“Fortress of jewels”, built 1646 on a bluff above the Paro River. Its great courtyard hosts the Paro Tshechu, one of Bhutan’s most atmospheric festivals.",
    image_url:
      "/images/bhutan/rinpung-dzong.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Rinpung_Dzong",
    source_label: "Wikipedia: Rinpung Dzong",
  },
  {
    id: "trongsa",
    kind: "heritage",
    path: 4,
    name: "Trongsa Dzong",
    region: "Trongsa",
    blurb:
      "Bhutan’s largest dzong, draped along a forested ridge. Ancestral seat of the first two kings; the Trongsa Penlop (governor) stepped up from here to the throne.",
    image_url:
      "/images/bhutan/trongsa-dzong.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 3.0",
    source_url: "https://en.wikipedia.org/wiki/Trongsa_Dzong",
    source_label: "Wikipedia: Trongsa Dzong",
  },
  {
    id: "jakar",
    kind: "heritage",
    path: 4,
    name: "Jakar Dzong",
    region: "Bumthang",
    blurb:
      "“Castle of the White Bird”, perched above Chokhor Valley. Legend says a white bird alighted where its foundations should rise — a divine sign for the first temple-fortress.",
    image_url:
      "/images/bhutan/jakar-dzong.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Jakar_Dzong",
    source_label: "Wikipedia: Jakar Dzong",
  },
  {
    id: "khamsum",
    kind: "heritage",
    path: 4,
    name: "Khamsum Yulley Namgyal Chorten",
    region: "Punakha",
    blurb:
      "A three-storey chorten built by the Queen Mother to dispel negative energies and bring peace to the world. An easy hike rewards visitors with sweeping valley views.",
    image_url:
      "/images/bhutan/khamsum-chorten.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY 3.0",
    source_url: "https://en.wikivoyage.org/wiki/Punakha#Do",
    source_label: "Wikivoyage: Punakha",
  },
  {
    id: "phobjikha",
    kind: "nature",
    path: 2,
    name: "Phobjikha (Gangtey) Valley",
    region: "Wangdue Phodrang",
    blurb:
      "A glacial trough ringed by forest — winter roost of the rare black-necked cranes, with Gangtey Goenba monastery overlooking the valley floor.",
    image_url:
      "/images/bhutan/phobjikha-valley.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY 2.0",
    source_url: "https://en.wikipedia.org/wiki/Phobjikha_Valley",
    source_label: "Wikipedia: Phobjikha Valley",
  },
  {
    id: "takin-preserve",
    kind: "nature",
    path: 2,
    name: "Royal Takin Preserve, Motithang",
    region: "Thimphu",
    blurb:
      "A hillside enclosure at the edge of Thimphu sheltering the takin, Bhutan’s national animal — the beloved “gnu goat” of the Divine Madman’s tale.",
    image_url:
      "/images/bhutan/takin.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Takin",
    source_label: "Wikipedia: Takin",
  },
  {
    id: "dochula",
    kind: "nature",
    path: 2,
    name: "Dochula Pass & the 108 Chortens",
    region: "Thimphu–Punakha road",
    blurb:
      "At 3,100 m, this mountain pass holds 108 whitewashed chortens built by the Queen Mother in 2004 to honor soldiers who fell in 2003. On clear days the Himalayas fill the horizon.",
    image_url:
      "/images/bhutan/dochula-pass.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Dochula",
    source_label: "Wikipedia: Dochula",
  },
  {
    id: "norzin-lam-stalls",
    kind: "restaurant",
    path: 3,
    name: "Norzin Lam evening food stalls",
    region: "Thimphu",
    blurb:
      "After 21:00, street stalls along Norzin Lam (between the Druk Hotel and the old taxi parking) serve thukpa and momos late into the night.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "zombala",
    kind: "restaurant",
    path: 3,
    name: "Zombala",
    region: "Thimphu",
    blurb:
      "Beloved late-night counter known for momos, kuka and pakoras; the thukpa is a bit bland, but the fried snacks are the draw.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "birbi",
    kind: "restaurant",
    path: 3,
    name: "Birbi",
    region: "Doebum Lam, Thimphu",
    blurb:
      "Garden-style seating off Doebum Lam; continental and Bhutanese-fusion plates with a relaxed neighborhood feel. Open daily 08:00–22:00.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "b-taco",
    kind: "restaurant",
    path: 3,
    name: "B.Taco",
    region: "Hejo, Thimphu",
    blurb:
      "Mexican spot in Hejo — tacos, burritos and salsas; a reliable non-Bhutanese option. Open 11:00–21:00.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "dim-sum-basket",
    kind: "restaurant",
    path: 3,
    name: "Dim Sum Basket",
    region: "Gaa-phel Shopping Center, Chorten Lam, Thimphu",
    blurb:
      "Cantonese dim sum on the 2nd floor of the Gaa-phel Shopping Center; a Cantonese menu that stands out in Thimphu.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "hayate-ramen",
    kind: "restaurant",
    path: 3,
    name: "Hayate Ramen",
    region: "Changlam, Thimphu",
    blurb:
      "Japanese ramen on the 2nd floor of Peljor Lhendrubling Building, opposite the central police station. 11:00–21:00; closed Tuesdays.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "phang-guu",
    kind: "restaurant",
    path: 3,
    name: "Phang-Guu",
    region: "Taba Gom Lam 7, Thimphu",
    blurb:
      "Authentic Bhutanese home-style cooking — ema datshi, shamu datshi and red rice; a dependable introduction to Bhutanese flavors. Open most days 09:00–22:00.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "sa-toh",
    kind: "restaurant",
    path: 3,
    name: "Sa-Toh",
    region: "Chang Lam, Thimphu",
    blurb:
      "Korean kitchen on the 3rd floor of the Jattu Commercial Complex — bibimbap, stews and grilled plates. Tue–Sun, 12:00–20:30.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "the-seasons",
    kind: "restaurant",
    path: 3,
    name: "The Seasons Restaurant & Pizzeria",
    region: "Phenday Lam, Thimphu",
    blurb:
      "Pizza and Italian plates in the Namsay Shopping Complex — a comfortable family option; Wed–Mon.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "vietnamese-yen",
    kind: "restaurant",
    path: 3,
    name: "Vietnamese Cuisine by Yen",
    region: "Chang Lam, Thimphu",
    blurb:
      "Banh mi, pho and Vietnamese home plates; light, fresh and fast. Wed–Mon, 10:00–21:00.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "yolo-eateries",
    kind: "restaurant",
    path: 3,
    name: "Yolo Eateries",
    region: "Norzin Lam, Thimphu",
    blurb:
      "Japanese-fusion café next to the Shantideva Hotel, facing the Clock Tower Square. Daily 09:00–20:00.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_THIMPHU,
    source_label: "Wikivoyage: Thimphu, Eat",
  },
  {
    id: "peljorling",
    kind: "restaurant",
    path: 3,
    name: "Hotel Peljorling Restaurant",
    region: "Paro",
    blurb:
      "By the Paro clock tower; a long-standing kitchen for local Bhutanese and Indian dishes at reasonable prices.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_PARO,
    source_label: "Wikivoyage: Paro, Eat",
  },
  {
    id: "sonam-trophel",
    kind: "restaurant",
    path: 3,
    name: "Sonam Trophel Restaurant",
    region: "Main Street, Paro",
    blurb:
      "Above Choden Handicrafts on Main Street; authentic Bhutanese, Nepalese and Indian food, espresso coffees and a warm, cosy room. Tue–Sun 10:00–20:30.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_PARO,
    source_label: "Wikivoyage: Paro, Eat",
  },
  {
    id: "indian-masala",
    kind: "restaurant",
    path: 3,
    name: "Indian Masala",
    region: "Main Street, Paro",
    blurb:
      "Large bright dining room on the 3rd floor of the Norbulingka Building, opposite the central police station; classic Indian thalis and curries.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_PARO,
    source_label: "Wikivoyage: Paro, Eat",
  },
  {
    id: "bridge-view",
    kind: "restaurant",
    path: 3,
    name: "Bridge View Restaurant",
    region: "Punakha",
    blurb:
      "On the east bank of the Punakha suspension bridge; open 24 hours — momos, pasta, chow mein, fast food, coffee and juice, river below.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_PUNAKHA,
    source_label: "Wikivoyage: Punakha, Eat",
  },
  {
    id: "ugyen-rinchen",
    kind: "restaurant",
    path: 3,
    name: "Ugyen Rinchen Druchar Restaurant",
    region: "Punakha",
    blurb:
      "Traditional Bhutanese and Indian cooking in town — dumplings, curry, pasta, soup, noodles and fried rice; mains about Nu. 200–300.",
    image_url: null,
    image_credit: null,
    source_url: WIKIVOYAGE_PUNAKHA,
    source_label: "Wikivoyage: Punakha, Eat",
  },
];

export const bhutanFolktales: GuideFolktale[] = [
  {
    id: "tigers-nest",
    path: 4,
    title: "The Tiger’s Nest",
    tradition: "Vajrayana Buddhist legend",
    story:
      "In the 8th century, Guru Rinpoche — Padmasambhava — flew from Tibet to Bhutan on the back of a tigress, a manifestation of the wisdom dakini Yeshe Tsogyal. He landed on the cliff now called Paro Taktsang and meditated in its cave, subduing the local spirits and planting Buddhism in Bhutan for the first time. The monastery built around that cave in 1692 still clings to the rock face, and every visitor who climbs the trail walks in the footprints of that flight.",
    moral:
      "What looks impossible from the valley floor becomes a place of refuge once you make the climb.",
    image_url:
      "/images/bhutan/taktsang-monastery-03.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Paro_Taktsang",
    source_label: "Wikipedia: Paro Taktsang",
  },
  {
    id: "divine-madman-takin",
    path: 4,
    title: "The Divine Madman and the Takin",
    tradition: "Drukpa Kagyu folk legend",
    story:
      "Drukpa Kunley, the “Divine Madman” of the 15th century, taught through outrageous humour and unconventional deeds. Challenged to prove his powers, he devoured an entire cow, then later placed its head upon the skeleton of a goat — and the creature came to life as the takin, a stocky gold-haired animal that was neither cow nor goat. The takin became Bhutan’s national animal, and a protected herd still grazes at the Royal Takin Preserve in Motithang, Thimphu.",
    moral:
      "Holiness can wear a fool’s face; wonder often arrives dressed as something absurd.",
    image_url:
      "/images/bhutan/takin.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Takin",
    source_label: "Wikipedia: Takin — national animal of Bhutan",
  },
  {
    id: "four-friends",
    path: 4,
    title: "The Four Harmonious Friends",
    tradition: "Jataka tale",
    story:
      "A partridge, a rabbit, a monkey and an elephant once found one fruit tree and argued over who should eat first. Instead of fighting, they agreed that each would help the others in turn: the bird planted the seed, the rabbit watered it, the monkey sheltered it and the elephant guarded it. In time they all ate the fruit, standing on one another’s shoulders. Bhutanese painters set this scene on temple walls — at Punakha Dzong it looks down on visitors today.",
    moral:
      "No one is tallest or smallest for long; the tree bears fruit only when all four work together.",
    image_url:
      "/images/bhutan/jataka-four-friends.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Punakha_Dzong",
    source_label: "Mural at Punakha Dzong; tale collected in Kunzang Choden, Folktales of Bhutan",
  },
  {
    id: "cranes-of-gangtey",
    path: 4,
    title: "The Cranes of Gangtey",
    tradition: "Living valley tradition",
    story:
      "Every November, black-necked cranes leave the Tibetan plateau and circle the walls of Gangtey Goenba before settling into the marshy floor of Phobjikha Valley for the winter. The valley welcomes them as honoured guests, and a festival marks their arrival; no one harms a crane here. When the birds lift away in spring, the valley feels half-empty until they return.",
    moral:
      "A valley that protects its winter guests is itself protected in turn.",
    image_url:
      "/images/bhutan/black-necked-crane.jpg",
    image_credit: "Photo: Wikimedia Commons · CC BY 4.0",
    source_url: "https://en.wikipedia.org/wiki/Black-necked_cranes_in_Bhutan",
    source_label: "Wikipedia: Black-necked cranes in Bhutan",
  },
  {
    id: "druk-thunder-dragon",
    path: 4,
    title: "Druk, the Thunder Dragon",
    tradition: "National mythology",
    story:
      "When the Tibetan master Tsangpa Gyare founded the Drukpa school of Tibetan Buddhism, thunder rolled through his mountain cave — the voice of the dragon. His followers became the “Drukpa”, people of the thunder dragon, and their country became Druk Yul, the Land of the Thunder Dragon. In Bhutan, thunder is still the dragon’s roar; the dragon clutching jewels in its claws stares out from the national flag, and druk motifs wind along every dzong wall.",
    moral:
      "Storms are not the mountain’s enemy — they are the mountain speaking.",
    image_url:
      "/images/bhutan/druk-dragon.png",
    image_credit: "Image: Wikimedia Commons · CC0",
    source_url: "https://en.wikipedia.org/wiki/Druk",
    source_label: "Wikipedia: Druk",
  },
  {
    id: "migoi",
    path: 4,
    title: "Migoi, the Glacier Being",
    tradition: "High-country folk tale",
    story:
      "High herders in Bhutan’s northern valleys tell of the migoi — a tall, long-haired being that walks upright through the snow, leaving enormous footprints and raiding camps for salt and meat. Some stories say it can turn invisible; others say it sings to lost travellers. The tales collected by Kunzang Choden in Bhutanese Tales of the Yeti show how mountain people explain strange tracks, sudden weather and the fear of high places. Whether you meet one or not, the story asks the same question: who is truly wild, the being in the snow or the one who follows it?",
    moral:
      "Respect what you cannot explain; the mountains keep their own counsel.",
    image_url:
      "/images/bhutan/himalayan-brown-bear.jpg",
    image_credit:
      "Photo: Himalayan brown bear, not a migoi — Wikimedia Commons · CC BY-SA 4.0",
    source_url: "https://en.wikipedia.org/wiki/Migoi",
    source_label: "Migoi; collected in Kunzang Choden, Bhutanese Tales of the Yeti (1997)",
  },
];

export function placeById(id: string): GuidePlace | undefined {
  return bhutanPlaces.find((p) => p.id === id);
}
export function folktaleById(id: string): GuideFolktale | undefined {
  return bhutanFolktales.find((t) => t.id === id);
}

/** Deterministic keyword search over the static guide (used by the agent). */
export function searchPlaces(input: {
  kind?: PlaceKind;
  region?: string;
  query?: string;
}): GuidePlace[] {
  const query = (input.query || "").trim().toLowerCase();
  const region = (input.region || "").trim().toLowerCase();
  return bhutanPlaces.filter((place) => {
    if (input.kind && place.kind !== input.kind) return false;
    if (region && !place.region.toLowerCase().includes(region)) return false;
    if (
      query &&
      !`${place.name} ${place.region} ${place.blurb} ${place.kind}`
        .toLowerCase()
        .includes(query)
    )
      return false;
    return true;
  });
}

