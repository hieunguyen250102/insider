/**
 * What the bots know about the 252 keywords: the themed groups the list was
 * written in, and yes/no questions they can ask about them. A question is a
 * predicate: the set of keywords for which a sensible Master says "Có".
 * Humans answer loosely, so the bots treat answers as evidence, not proof.
 *
 * A bot Master answers from the same predicates, so it lives in shared/: the
 * client offers them as one-tap questions and previews how a typed one reads.
 */

import type { Answer } from './types';
import { answerMatches, foldText } from './engine';
import { ALL_WORDS } from './words';

/** The 42 rows of six the kit's word list was written in (images/05_du_lieu/build_insider.py). */
const GROUPS: Record<string, string[]> = {
  school: ['Bút chì', 'Cục tẩy', 'Thước kẻ', 'Vở học sinh', 'Bảng đen', 'Cặp sách'],
  bathroom: ['Bàn chải đánh răng', 'Khăn tắm', 'Xà phòng', 'Gương soi', 'Máy sấy tóc', 'Lược'],
  kitchen: ['Nồi cơm điện', 'Chảo', 'Ấm đun nước', 'Tủ lạnh', 'Lò vi sóng', 'Đũa'],
  bedroom: ['Giường ngủ', 'Gối', 'Chăn', 'Tủ quần áo', 'Rèm cửa', 'Đèn bàn'],
  electronics: ['Điện thoại', 'Máy tính xách tay', 'Bàn phím', 'Tai nghe', 'Máy ảnh', 'Ti vi'],
  transport: ['Xe đạp', 'Xe máy', 'Ô tô', 'Xe buýt', 'Tàu hỏa', 'Máy bay'],
  craft: ['Thuyền buồm', 'Tàu ngầm', 'Khinh khí cầu', 'Trực thăng', 'Xe cứu hỏa', 'Xe cứu thương'],
  beasts: ['Con mèo', 'Con chó', 'Con thỏ', 'Con voi', 'Hươu cao cổ', 'Sư tử'],
  sea: ['Cá heo', 'Cá mập', 'Bạch tuộc', 'Rùa biển', 'Sứa', 'Cá ngựa'],
  birds: ['Chim cánh cụt', 'Đại bàng', 'Chim sẻ', 'Cú mèo', 'Chim công', 'Chim gõ kiến'],
  bugs: ['Con kiến', 'Con ong', 'Bươm bướm', 'Chuồn chuồn', 'Con nhện', 'Ốc sên'],
  fruit1: ['Quả táo', 'Quả chuối', 'Quả xoài', 'Quả cam', 'Dưa hấu', 'Quả dứa'],
  fruit2: ['Quả dừa', 'Quả nho', 'Dâu tây', 'Sầu riêng', 'Thanh long', 'Quả bơ'],
  veg: ['Cà rốt', 'Khoai tây', 'Cà chua', 'Bắp cải', 'Bí đỏ', 'Dưa chuột'],
  dishes: ['Phở', 'Bánh mì', 'Bánh chưng', 'Bún bò', 'Cơm tấm', 'Gỏi cuốn'],
  sweets: ['Kem', 'Sô cô la', 'Bánh sinh nhật', 'Bỏng ngô', 'Sữa chua', 'Kẹo bông'],
  drinks: ['Cà phê', 'Trà sữa', 'Nước mía', 'Nước cam', 'Sữa đậu nành', 'Nước dừa'],
  civic: ['Trường học', 'Bệnh viện', 'Thư viện', 'Bưu điện', 'Nhà ga', 'Sân bay'],
  shops: ['Siêu thị', 'Chợ', 'Nhà hàng', 'Khách sạn', 'Rạp chiếu phim', 'Bảo tàng'],
  leisure: ['Công viên', 'Sở thú', 'Bể bơi', 'Sân vận động', 'Vườn bách thảo', 'Khu cắm trại'],
  wild: ['Bãi biển', 'Sa mạc', 'Núi lửa', 'Hang động', 'Thác nước', 'Đảo'],
  sky: ['Mặt trời', 'Mặt trăng', 'Cầu vồng', 'Sấm sét', 'Bông tuyết', 'Sương mù'],
  weather: ['Mưa đá', 'Cơn bão', 'Gió', 'Thủy triều', 'Động đất', 'Nhật thực'],
  jobs1: ['Bác sĩ', 'Giáo viên', 'Đầu bếp', 'Phi công', 'Lính cứu hỏa', 'Nông dân'],
  jobs2: ['Thợ may', 'Thợ cắt tóc', 'Nhiếp ảnh gia', 'Họa sĩ', 'Ca sĩ', 'Diễn viên'],
  jobs3: ['Kiến trúc sư', 'Lập trình viên', 'Nhà khoa học', 'Thợ xây', 'Tài xế', 'Ngư dân'],
  music: ['Đàn piano', 'Đàn ghi ta', 'Trống', 'Sáo', 'Đàn vi ô lông', 'Kèn trumpet'],
  ballgames: ['Bóng đá', 'Bóng rổ', 'Cầu lông', 'Bóng bàn', 'Bơi lội', 'Cờ vua'],
  sports: ['Trượt băng', 'Leo núi', 'Bắn cung', 'Đấu kiếm', 'Nhảy dây', 'Chạy bộ'],
  wear: ['Áo mưa', 'Mũ bảo hiểm', 'Kính râm', 'Găng tay', 'Khăn quàng cổ', 'Ủng'],
  jewels: ['Nhẫn', 'Vòng tay', 'Dây chuyền', 'Hoa tai', 'Đồng hồ đeo tay', 'Ví tiền'],
  tools: ['Chìa khóa', 'Ổ khóa', 'Kéo', 'Búa', 'Tua vít', 'Kìm'],
  explore: ['La bàn', 'Bản đồ', 'Kính lúp', 'Ống nhòm', 'Đèn pin', 'Lều'],
  plants: ['Cây tre', 'Cây thông', 'Cây xương rồng', 'Hoa sen', 'Hoa hồng', 'Hoa hướng dương'],
  flora: ['Rễ cây', 'Lá cây', 'Hạt giống', 'Nấm', 'Rêu', 'Rong biển'],
  events: ['Sinh nhật', 'Đám cưới', 'Tết Nguyên đán', 'Tết Trung thu', 'Lễ tốt nghiệp', 'Lễ hội'],
  hobbies: ['Nấu ăn', 'Đọc sách', 'Vẽ tranh', 'Chụp ảnh', 'Làm vườn', 'Câu cá'],
  chores: ['Đánh răng', 'Rửa bát', 'Giặt quần áo', 'Quét nhà', 'Tưới cây', 'Gói quà'],
  space: ['Robot', 'Tên lửa', 'Vệ tinh', 'Trạm vũ trụ', 'Kính thiên văn', 'Phi hành gia'],
  landmarks: ['Kim tự tháp', 'Vạn Lý Trường Thành', 'Tháp Eiffel', 'Chùa Một Cột', 'Vịnh Hạ Long', 'Hồ Gươm'],
  fantasy: ['Con rồng', 'Nàng tiên cá', 'Người tuyết', 'Phù thủy', 'Ma cà rồng', 'Kỳ lân'],
  mail: ['Bưu thiếp', 'Phong bì', 'Con tem', 'Vé tàu', 'Hộ chiếu', 'Vali'],
};

export interface Predicate {
  id: string;
  /** asked to the Master exactly like this */
  text: string;
  yes: Set<string>;
}

/** Groups by key, plus single words, minus exceptions. */
function set(groups: string[], extra: string[] = [], minus: string[] = []): Set<string> {
  const s = new Set<string>([...groups.flatMap((g) => GROUPS[g]), ...extra]);
  for (const m of minus) s.delete(m);
  return s;
}

export const PREDICATES: Predicate[] = [
  { id: 'animal', text: 'Nó là con vật à?', yes: set(['beasts', 'sea', 'birds', 'bugs']) },
  { id: 'job', text: 'Có phải là một nghề nghiệp không?', yes: set(['jobs1', 'jobs2', 'jobs3'], ['Phi hành gia']) },
  {
    id: 'person',
    text: 'Có phải là một người không?',
    yes: set(['jobs1', 'jobs2', 'jobs3'], ['Phi hành gia', 'Phù thủy', 'Nàng tiên cá', 'Người tuyết', 'Ma cà rồng']),
  },
  { id: 'food', text: 'Có ăn được không?', yes: set(['fruit1', 'fruit2', 'veg', 'dishes', 'sweets'], ['Nấm', 'Rong biển']) },
  { id: 'drink', text: 'Có phải đồ uống không?', yes: set(['drinks']) },
  { id: 'place', text: 'Có phải là một địa điểm không?', yes: set(['civic', 'shops', 'leisure', 'wild', 'landmarks'], ['Trạm vũ trụ']) },
  { id: 'vehicle', text: 'Có phải phương tiện đi lại không?', yes: set(['transport', 'craft'], ['Tên lửa']) },
  {
    id: 'electric',
    text: 'Nó có chạy bằng điện không?',
    yes: set(['electronics'], ['Nồi cơm điện', 'Ấm đun nước', 'Tủ lạnh', 'Lò vi sóng', 'Máy sấy tóc', 'Đèn bàn', 'Robot', 'Đèn pin', 'Tàu hỏa']),
  },
  { id: 'home', text: 'Có thường thấy trong nhà không?', yes: set(['bathroom', 'kitchen', 'bedroom', 'electronics'], ['Chìa khóa', 'Kéo', 'Ổ khóa', 'Búa']) },
  { id: 'nature', text: 'Có phải hiện tượng thiên nhiên không?', yes: set(['sky', 'weather']) },
  { id: 'weather', text: 'Có liên quan đến thời tiết không?', yes: set([], ['Cầu vồng', 'Sấm sét', 'Bông tuyết', 'Sương mù', 'Mưa đá', 'Cơn bão', 'Gió', 'Áo mưa', 'Ủng']) },
  {
    id: 'fly',
    text: 'Nó có bay được không?',
    yes: set(
      [],
      ['Máy bay', 'Trực thăng', 'Khinh khí cầu', 'Tên lửa', 'Đại bàng', 'Chim sẻ', 'Cú mèo', 'Chim công', 'Chim gõ kiến', 'Con ong', 'Bươm bướm', 'Chuồn chuồn', 'Con rồng', 'Phù thủy', 'Vệ tinh'],
    ),
  },
  {
    id: 'water',
    text: 'Có liên quan đến nước hay biển không?',
    yes: set(
      ['sea'],
      ['Thuyền buồm', 'Tàu ngầm', 'Bể bơi', 'Bãi biển', 'Thác nước', 'Đảo', 'Thủy triều', 'Bơi lội', 'Câu cá', 'Ngư dân', 'Rong biển', 'Hoa sen', 'Nàng tiên cá', 'Vịnh Hạ Long', 'Hồ Gươm', 'Nước mía', 'Nước dừa', 'Nước cam', 'Tưới cây', 'Rửa bát'],
    ),
  },
  { id: 'activity', text: 'Có phải là một hoạt động (việc mình làm) không?', yes: set(['ballgames', 'sports', 'hobbies', 'chores']) },
  { id: 'sport', text: 'Có phải môn thể thao không?', yes: set(['ballgames', 'sports']) },
  { id: 'ball', text: 'Có chơi với quả bóng không?', yes: set([], ['Bóng đá', 'Bóng rổ', 'Bóng bàn']) },
  { id: 'chore', text: 'Có phải việc nhà không?', yes: set(['chores'], ['Nấu ăn', 'Làm vườn']) },
  { id: 'instrument', text: 'Có phải nhạc cụ không?', yes: set(['music']) },
  { id: 'wear', text: 'Có đeo hoặc mặc lên người được không?', yes: set(['wear', 'jewels'], ['Tai nghe'], ['Ví tiền']) },
  { id: 'jewel', text: 'Có phải đồ trang sức không?', yes: set([], ['Nhẫn', 'Vòng tay', 'Dây chuyền', 'Hoa tai', 'Đồng hồ đeo tay']) },
  { id: 'plant', text: 'Có phải cây cối, hoa lá không?', yes: set(['plants', 'flora'], ['Làm vườn', 'Tưới cây'], ['Nấm']) },
  { id: 'flower', text: 'Có phải một loài hoa không?', yes: set([], ['Hoa sen', 'Hoa hồng', 'Hoa hướng dương']) },
  { id: 'event', text: 'Có phải một dịp lễ hay sự kiện không?', yes: set(['events']) },
  { id: 'space', text: 'Có liên quan đến vũ trụ không?', yes: set(['space'], ['Mặt trời', 'Mặt trăng', 'Nhật thực'], ['Robot']) },
  { id: 'fantasy', text: 'Có phải nhân vật tưởng tượng không?', yes: set(['fantasy']) },
  { id: 'fruit', text: 'Có phải trái cây không?', yes: set(['fruit1', 'fruit2']) },
  { id: 'vegetable', text: 'Có phải rau củ không?', yes: set(['veg']) },
  { id: 'dish', text: 'Có phải món ăn Việt Nam không?', yes: set(['dishes']) },
  { id: 'sweet', text: 'Có phải đồ ngọt, ăn vặt không?', yes: set(['sweets'], ['Trà sữa']) },
  { id: 'tropical', text: 'Có mọc ở vùng nhiệt đới như Việt Nam không?', yes: set([], ['Quả chuối', 'Quả xoài', 'Quả dứa', 'Quả dừa', 'Sầu riêng', 'Thanh long', 'Quả bơ', 'Cây tre', 'Hoa sen', 'Dưa hấu']) },
  { id: 'hand-tool', text: 'Có phải dụng cụ cầm tay không?', yes: set(['tools', 'explore'], ['Bút chì', 'Cục tẩy', 'Thước kẻ', 'Lược', 'Bàn chải đánh răng', 'Đũa', 'Chảo'], ['Lều', 'Ổ khóa']) },
  { id: 'school', text: 'Có liên quan đến trường học không?', yes: set(['school'], ['Trường học', 'Giáo viên', 'Thư viện', 'Lễ tốt nghiệp', 'Đọc sách']) },
  { id: 'building', text: 'Có phải một tòa nhà không?', yes: set(['civic', 'shops'], ['Trạm vũ trụ', 'Chùa Một Cột'], ['Chợ']) },
  { id: 'landmark', text: 'Có phải một địa danh nổi tiếng không?', yes: set(['landmarks']) },
  { id: 'vietnam', text: 'Có phải chỉ có ở Việt Nam không?', yes: set(['dishes'], ['Chùa Một Cột', 'Vịnh Hạ Long', 'Hồ Gươm', 'Tết Nguyên đán', 'Nước mía']) },
  { id: 'bird', text: 'Có phải loài chim không?', yes: set(['birds']) },
  { id: 'underwater', text: 'Nó sống dưới nước à?', yes: set(['sea'], ['Rong biển', 'Nàng tiên cá', 'Hoa sen']) },
  { id: 'bug', text: 'Có phải con vật nhỏ xíu, côn trùng không?', yes: set(['bugs']) },
  { id: 'pet', text: 'Có nuôi làm thú cưng được không?', yes: set([], ['Con mèo', 'Con chó', 'Con thỏ', 'Cá ngựa', 'Rùa biển']) },
  { id: 'four-legs', text: 'Nó có bốn chân không?', yes: set(['beasts'], ['Kỳ lân', 'Con rồng']) },
  { id: 'paper', text: 'Có làm bằng giấy không?', yes: set(['mail'], ['Vở học sinh', 'Bản đồ'], ['Vali']) },
  { id: 'travel', text: 'Có mang theo khi đi du lịch không?', yes: set(['explore'], ['Hộ chiếu', 'Vali', 'Vé tàu', 'Máy ảnh', 'Kính râm', 'Bản đồ']) },
  { id: 'kitchen', text: 'Có ở trong bếp không?', yes: set(['kitchen'], ['Rửa bát', 'Nấu ăn']) },
  { id: 'bathroom', text: 'Có ở trong phòng tắm không?', yes: set(['bathroom'], ['Đánh răng']) },
  { id: 'bed', text: 'Có ở trong phòng ngủ không?', yes: set(['bedroom']) },
  { id: 'metal', text: 'Có làm bằng kim loại không?', yes: set(['tools'], ['Nhẫn', 'Vòng tay', 'Dây chuyền', 'Chảo', 'Búa', 'Kèn trumpet', 'Robot', 'Tên lửa', 'Vệ tinh']) },
  { id: 'screen', text: 'Nó có màn hình không?', yes: set([], ['Điện thoại', 'Máy tính xách tay', 'Ti vi', 'Máy ảnh']) },
  { id: 'wheels', text: 'Nó có bánh xe không?', yes: set([], ['Xe đạp', 'Xe máy', 'Ô tô', 'Xe buýt', 'Tàu hỏa', 'Xe cứu hỏa', 'Xe cứu thương', 'Máy bay', 'Vali']) },
  {
    id: 'big',
    text: 'Nó có to hơn một người không?',
    yes: set(
      ['transport', 'craft', 'civic', 'shops', 'leisure', 'wild', 'landmarks'],
      ['Con voi', 'Hươu cao cổ', 'Cá mập', 'Cá heo', 'Tủ lạnh', 'Tủ quần áo', 'Giường ngủ', 'Con rồng', 'Mặt trời', 'Mặt trăng', 'Cầu vồng', 'Tên lửa', 'Trạm vũ trụ', 'Cây tre', 'Cây thông', 'Đàn piano'],
      ['Xe đạp'],
    ),
  },
  { id: 'hot', text: 'Nó có nóng không?', yes: set([], ['Mặt trời', 'Núi lửa', 'Sa mạc', 'Phở', 'Cà phê', 'Nồi cơm điện', 'Ấm đun nước', 'Lò vi sóng', 'Chảo', 'Máy sấy tóc', 'Bún bò']) },
  { id: 'cold', text: 'Nó có lạnh không?', yes: set([], ['Kem', 'Bông tuyết', 'Người tuyết', 'Tủ lạnh', 'Trượt băng', 'Mưa đá', 'Chim cánh cụt']) },
  { id: 'art', text: 'Có liên quan đến nghệ thuật không?', yes: set(['music'], ['Họa sĩ', 'Ca sĩ', 'Diễn viên', 'Vẽ tranh', 'Chụp ảnh', 'Nhiếp ảnh gia', 'Rạp chiếu phim', 'Bảo tàng']) },
  { id: 'night', text: 'Có thấy vào ban đêm không?', yes: set([], ['Mặt trăng', 'Cú mèo', 'Ma cà rồng', 'Đèn pin', 'Đèn bàn', 'Kính thiên văn', 'Tết Trung thu']) },
];

export const PREDICATE_BY_ID = new Map(PREDICATES.map((p) => [p.id, p]));

/**
 * Phrases (folded, whole words) that tell a bot Master which predicate a typed
 * question means. Avoid bare syllables that fold into other words ("dien" is
 * also "diễn"); where two predicates match, the longer phrase wins.
 */
const KEYS: Record<string, string[]> = {
  animal: ['con vat', 'dong vat', 'loai vat', 'thu vat'],
  job: ['nghe nghiep', 'lam nghe', 'mot nghe'],
  person: ['con nguoi', 'mot nguoi', 'la nguoi', 'nguoi that'],
  food: ['an duoc', 'do an', 'thuc an', 'de an', 'mon an'],
  drink: ['do uong', 'uong duoc', 'thuc uong', 'de uong'],
  place: ['dia diem', 'noi chon', 'mot noi', 'mot cho'],
  vehicle: ['phuong tien', 'di lai', 'giao thong'],
  electric: ['chay bang dien', 'dung dien', 'can dien', 'do dien', 'thiet bi dien', 'cam dien', 'dien tu'],
  home: ['trong nha', 'o nha', 'trong gia dinh'],
  nature: ['thien nhien', 'hien tuong'],
  weather: ['thoi tiet'],
  fly: ['bay duoc', 'biet bay', 'bay len', 'bay tren troi'],
  water: ['nuoc', 'bien', 'song ho'],
  activity: ['hoat dong', 'viec minh lam', 'hanh dong'],
  sport: ['the thao'],
  ball: ['qua bong', 'trai bong', 'choi bong'],
  chore: ['viec nha'],
  instrument: ['nhac cu', 'choi nhac'],
  wear: ['mac duoc', 'deo duoc', 'mac len', 'deo len', 'mac vao', 'deo vao', 'quan ao', 'do mac'],
  jewel: ['trang suc'],
  plant: ['cay coi', 'thuc vat', 'hoa la', 'loai cay'],
  flower: ['loai hoa', 'bong hoa', 'mot hoa'],
  event: ['dip le', 'su kien', 'ngay le', 'ngay hoi'],
  space: ['vu tru', 'thien van'],
  fantasy: ['tuong tuong', 'than thoai', 'co tich', 'khong co that'],
  fruit: ['trai cay', 'hoa qua'],
  vegetable: ['rau cu', 'rau', 'loai rau'],
  dish: ['mon an viet', 'mon viet', 'dac san'],
  sweet: ['do ngot', 'an vat', 'banh keo', 'ngot'],
  tropical: ['nhiet doi'],
  'hand-tool': ['dung cu', 'cam tay', 'cong cu'],
  school: ['truong hoc', 'hoc sinh', 'hoc tap', 'di hoc'],
  building: ['toa nha', 'ngoi nha', 'cong trinh'],
  landmark: ['dia danh', 'noi tieng'],
  vietnam: ['viet nam'],
  bird: ['chim', 'loai chim'],
  underwater: ['duoi nuoc', 'song duoi', 'duoi bien'],
  bug: ['con trung', 'sau bo', 'nho xiu'],
  pet: ['thu cung', 'nuoi'],
  'four-legs': ['bon chan', '4 chan'],
  paper: ['bang giay', 'tu giay', 'lam giay'],
  travel: ['du lich'],
  kitchen: ['bep', 'nha bep', 'trong bep', 'trong nha bep'],
  bathroom: ['phong tam', 'nha tam', 've sinh'],
  bed: ['phong ngu', 'di ngu'],
  metal: ['kim loai', 'bang sat', 'bang thep'],
  screen: ['man hinh'],
  wheels: ['banh xe'],
  big: ['to hon nguoi', 'to hon mot nguoi', 'lon hon nguoi', 'lon hon mot nguoi', 'to lon', 'rat to', 'rat lon'],
  hot: ['nong'],
  cold: ['lanh'],
  art: ['nghe thuat'],
  night: ['ban dem', 'buoi toi', 'dem'],
};

const FOLDED_TEXT = new Map(PREDICATES.map((p) => [foldText(p.text), p]));

/** The predicate a typed question asks, or undefined when it is unclear. */
export function matchQuestion(text: string): Predicate | undefined {
  const f = foldText(text);
  const exact = FOLDED_TEXT.get(f);
  if (exact) return exact;
  const padded = ` ${f} `;
  let best: Predicate | undefined;
  let bestLen = 0;
  let tied = false;
  for (const p of PREDICATES) {
    const len = Math.max(0, ...(KEYS[p.id] ?? []).filter((k) => padded.includes(` ${k} `)).map((k) => k.length));
    if (!len || len < bestLen) continue;
    tied = len === bestLen;
    if (len > bestLen) [best, bestLen] = [p, len];
  }
  return tied ? undefined : best;
}

/**
 * How a bot Master answers: the keyword named → "Đúng rồi!", another keyword
 * named → "Không", a predicate → the truth, anything else → "Không biết".
 */
export function masterAnswer(word: string, text: string, predicateId?: string): { answer: Answer; predicate?: Predicate } {
  const known = predicateId ? PREDICATE_BY_ID.get(predicateId) : undefined;
  if (known) return { answer: known.yes.has(word) ? 'yes' : 'no', predicate: known };
  if (answerMatches(word, text)) return { answer: 'correct' };
  if (ALL_WORDS.some((w) => answerMatches(w, text))) return { answer: 'no' };
  const p = matchQuestion(text);
  if (p) return { answer: p.yes.has(word) ? 'yes' : 'no', predicate: p };
  return { answer: 'unknown' };
}

/** Which group a keyword belongs to, for the bots' small talk. */
export const GROUP_OF = new Map<string, string>(Object.entries(GROUPS).flatMap(([g, ws]) => ws.map((w) => [w, g] as const)));

/** Spelled exactly as the cards print them (checked by the tests). */
export const KNOWN_WORDS = new Set(Object.values(GROUPS).flat());

export function unknownWords(): string[] {
  return ALL_WORDS.filter((w) => !KNOWN_WORDS.has(w));
}
