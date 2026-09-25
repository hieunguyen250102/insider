/**
 * The 42 keyword cards of the printed kit (images/05_du_lieu), in the same
 * order and with the same back numbers, so the online table deals exactly
 * the cards you can print. Generated from insider_252_tu_khoa.json.
 */

export interface KeywordCard {
  id: string;
  /** the number on the back, 1–6: it picks the row on the card above it */
  back: number;
  words: string[];
}

export const CARDS: KeywordCard[] = [
  { id: '001', back: 1, words: ['Sấm sét', 'Dâu tây', 'Kính thiên văn', 'Nấu ăn', 'Bún bò', 'Dưa hấu'] },
  { id: '002', back: 1, words: ['Bạch tuộc', 'Bác sĩ', 'Cà phê', 'Thư viện', 'Khăn tắm', 'Bể bơi'] },
  { id: '003', back: 1, words: ['Thủy triều', 'Cây xương rồng', 'Búa', 'Ma cà rồng', 'Rễ cây', 'Gương soi'] },
  { id: '004', back: 1, words: ['Nhà khoa học', 'Sở thú', 'Nàng tiên cá', 'Lều', 'Vạn Lý Trường Thành', 'Bỏng ngô'] },
  { id: '005', back: 1, words: ['Cà chua', 'Chăn', 'Quả nho', 'Sứa', 'Bản đồ', 'La bàn'] },
  { id: '006', back: 1, words: ['Chim sẻ', 'Trường học', 'Tưới cây', 'Nồi cơm điện', 'Lò vi sóng', 'Phù thủy'] },
  { id: '007', back: 1, words: ['Ca sĩ', 'Sa mạc', 'Trực thăng', 'Nông dân', 'Sầu riêng', 'Phở'] },
  { id: '008', back: 2, words: ['Ủng', 'Robot', 'Bơi lội', 'Bút chì', 'Nhảy dây', 'Găng tay'] },
  { id: '009', back: 2, words: ['Quả táo', 'Tủ lạnh', 'Quả cam', 'Gỏi cuốn', 'Đồng hồ đeo tay', 'Cờ vua'] },
  { id: '010', back: 2, words: ['Cầu vồng', 'Dây chuyền', 'Đèn bàn', 'Đấu kiếm', 'Quả chuối', 'Con chó'] },
  { id: '011', back: 2, words: ['Bông tuyết', 'Điện thoại', 'Bưu thiếp', 'Leo núi', 'Họa sĩ', 'Sáo'] },
  { id: '012', back: 2, words: ['Áo mưa', 'Cầu lông', 'Lễ tốt nghiệp', 'Vali', 'Làm vườn', 'Cơm tấm'] },
  { id: '013', back: 2, words: ['Chim công', 'Thước kẻ', 'Hoa hướng dương', 'Giường ngủ', 'Vòng tay', 'Đánh răng'] },
  { id: '014', back: 2, words: ['Cơn bão', 'Con rồng', 'Phong bì', 'Thợ may', 'Hồ Gươm', 'Xe cứu thương'] },
  { id: '015', back: 3, words: ['Mặt trời', 'Phi công', 'Núi lửa', 'Nhẫn', 'Tết Nguyên đán', 'Đàn vi ô lông'] },
  { id: '016', back: 3, words: ['Lễ hội', 'Quét nhà', 'Chạy bộ', 'Tàu ngầm', 'Vẽ tranh', 'Lược'] },
  { id: '017', back: 3, words: ['Bánh mì', 'Lá cây', 'Khăn quàng cổ', 'Bươm bướm', 'Sương mù', 'Công viên'] },
  { id: '018', back: 3, words: ['Gió', 'Hộ chiếu', 'Máy bay', 'Đàn ghi ta', 'Lính cứu hỏa', 'Kem'] },
  { id: '019', back: 3, words: ['Chụp ảnh', 'Vịnh Hạ Long', 'Rong biển', 'Giặt quần áo', 'Rạp chiếu phim', 'Hạt giống'] },
  { id: '020', back: 3, words: ['Cá ngựa', 'Cá mập', 'Con ong', 'Hoa hồng', 'Khinh khí cầu', 'Kỳ lân'] },
  { id: '021', back: 3, words: ['Tai nghe', 'Chùa Một Cột', 'Gói quà', 'Hoa sen', 'Bắp cải', 'Mũ bảo hiểm'] },
  { id: '022', back: 4, words: ['Tài xế', 'Con tem', 'Con mèo', 'Chim gõ kiến', 'Cây thông', 'Chợ'] },
  { id: '023', back: 4, words: ['Kim tự tháp', 'Cá heo', 'Rửa bát', 'Thợ xây', 'Ngư dân', 'Phi hành gia'] },
  { id: '024', back: 4, words: ['Bảo tàng', 'Cặp sách', 'Nước mía', 'Thanh long', 'Nấm', 'Ống nhòm'] },
  { id: '025', back: 4, words: ['Người tuyết', 'Giáo viên', 'Xà phòng', 'Siêu thị', 'Nước dừa', 'Cây tre'] },
  { id: '026', back: 4, words: ['Thác nước', 'Lập trình viên', 'Xe buýt', 'Bàn phím', 'Đầu bếp', 'Sữa đậu nành'] },
  { id: '027', back: 4, words: ['Kiến trúc sư', 'Ổ khóa', 'Cà rốt', 'Quả bơ', 'Gối', 'Con thỏ'] },
  { id: '028', back: 4, words: ['Sữa chua', 'Dưa chuột', 'Chuồn chuồn', 'Máy tính xách tay', 'Bệnh viện', 'Vệ tinh'] },
  { id: '029', back: 5, words: ['Đèn pin', 'Hang động', 'Ô tô', 'Máy sấy tóc', 'Con kiến', 'Hoa tai'] },
  { id: '030', back: 5, words: ['Động đất', 'Thuyền buồm', 'Câu cá', 'Trạm vũ trụ', 'Bóng bàn', 'Chảo'] },
  { id: '031', back: 5, words: ['Quả xoài', 'Mưa đá', 'Vé tàu', 'Hươu cao cổ', 'Bóng đá', 'Rèm cửa'] },
  { id: '032', back: 5, words: ['Xe đạp', 'Trà sữa', 'Tủ quần áo', 'Nước cam', 'Kìm', 'Khách sạn'] },
  { id: '033', back: 5, words: ['Kẹo bông', 'Bãi biển', 'Con nhện', 'Vườn bách thảo', 'Bánh sinh nhật', 'Máy ảnh'] },
  { id: '034', back: 5, words: ['Đũa', 'Bảng đen', 'Kính lúp', 'Khoai tây', 'Tháp Eiffel', 'Mặt trăng'] },
  { id: '035', back: 5, words: ['Quả dứa', 'Trượt băng', 'Cú mèo', 'Xe cứu hỏa', 'Vở học sinh', 'Ấm đun nước'] },
  { id: '036', back: 6, words: ['Bắn cung', 'Bàn chải đánh răng', 'Thợ cắt tóc', 'Chìa khóa', 'Kèn trumpet', 'Xe máy'] },
  { id: '037', back: 6, words: ['Tên lửa', 'Rêu', 'Đại bàng', 'Khu cắm trại', 'Diễn viên', 'Ti vi'] },
  { id: '038', back: 6, words: ['Đọc sách', 'Rùa biển', 'Sân bay', 'Bưu điện', 'Đảo', 'Quả dừa'] },
  { id: '039', back: 6, words: ['Nhiếp ảnh gia', 'Sinh nhật', 'Cục tẩy', 'Ốc sên', 'Tết Trung thu', 'Nhà ga'] },
  { id: '040', back: 6, words: ['Con voi', 'Đám cưới', 'Đàn piano', 'Nhà hàng', 'Bánh chưng', 'Trống'] },
  { id: '041', back: 6, words: ['Sân vận động', 'Bóng rổ', 'Kéo', 'Tua vít', 'Nhật thực', 'Bí đỏ'] },
  { id: '042', back: 6, words: ['Sư tử', 'Sô cô la', 'Ví tiền', 'Tàu hỏa', 'Chim cánh cụt', 'Kính râm'] },
];

export const ALL_WORDS: string[] = CARDS.flatMap((c) => c.words);
