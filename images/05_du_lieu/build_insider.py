from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,random,csv,zipfile,io,os
R=Path('/workspace/scratch/c2a5bb4eaf91/insider_vi')
CREAM='#F7F0DF'; RED='#D83D31'; INK='#242422'; MUTED='#756D60'
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
rows='''Bút chì|Cục tẩy|Thước kẻ|Vở học sinh|Bảng đen|Cặp sách
Bàn chải đánh răng|Khăn tắm|Xà phòng|Gương soi|Máy sấy tóc|Lược
Nồi cơm điện|Chảo|Ấm đun nước|Tủ lạnh|Lò vi sóng|Đũa
Giường ngủ|Gối|Chăn|Tủ quần áo|Rèm cửa|Đèn bàn
Điện thoại|Máy tính xách tay|Bàn phím|Tai nghe|Máy ảnh|Ti vi
Xe đạp|Xe máy|Ô tô|Xe buýt|Tàu hỏa|Máy bay
Thuyền buồm|Tàu ngầm|Khinh khí cầu|Trực thăng|Xe cứu hỏa|Xe cứu thương
Con mèo|Con chó|Con thỏ|Con voi|Hươu cao cổ|Sư tử
Cá heo|Cá mập|Bạch tuộc|Rùa biển|Sứa|Cá ngựa
Chim cánh cụt|Đại bàng|Chim sẻ|Cú mèo|Chim công|Chim gõ kiến
Con kiến|Con ong|Bươm bướm|Chuồn chuồn|Con nhện|Ốc sên
Quả táo|Quả chuối|Quả xoài|Quả cam|Dưa hấu|Quả dứa
Quả dừa|Quả nho|Dâu tây|Sầu riêng|Thanh long|Quả bơ
Cà rốt|Khoai tây|Cà chua|Bắp cải|Bí đỏ|Dưa chuột
Phở|Bánh mì|Bánh chưng|Bún bò|Cơm tấm|Gỏi cuốn
Kem|Sô cô la|Bánh sinh nhật|Bỏng ngô|Sữa chua|Kẹo bông
Cà phê|Trà sữa|Nước mía|Nước cam|Sữa đậu nành|Nước dừa
Trường học|Bệnh viện|Thư viện|Bưu điện|Nhà ga|Sân bay
Siêu thị|Chợ|Nhà hàng|Khách sạn|Rạp chiếu phim|Bảo tàng
Công viên|Sở thú|Bể bơi|Sân vận động|Vườn bách thảo|Khu cắm trại
Bãi biển|Sa mạc|Núi lửa|Hang động|Thác nước|Đảo
Mặt trời|Mặt trăng|Cầu vồng|Sấm sét|Bông tuyết|Sương mù
Mưa đá|Cơn bão|Gió|Thủy triều|Động đất|Nhật thực
Bác sĩ|Giáo viên|Đầu bếp|Phi công|Lính cứu hỏa|Nông dân
Thợ may|Thợ cắt tóc|Nhiếp ảnh gia|Họa sĩ|Ca sĩ|Diễn viên
Kiến trúc sư|Lập trình viên|Nhà khoa học|Thợ xây|Tài xế|Ngư dân
Đàn piano|Đàn ghi ta|Trống|Sáo|Đàn vi ô lông|Kèn trumpet
Bóng đá|Bóng rổ|Cầu lông|Bóng bàn|Bơi lội|Cờ vua
Trượt băng|Leo núi|Bắn cung|Đấu kiếm|Nhảy dây|Chạy bộ
Áo mưa|Mũ bảo hiểm|Kính râm|Găng tay|Khăn quàng cổ|Ủng
Nhẫn|Vòng tay|Dây chuyền|Hoa tai|Đồng hồ đeo tay|Ví tiền
Chìa khóa|Ổ khóa|Kéo|Búa|Tua vít|Kìm
La bàn|Bản đồ|Kính lúp|Ống nhòm|Đèn pin|Lều
Cây tre|Cây thông|Cây xương rồng|Hoa sen|Hoa hồng|Hoa hướng dương
Rễ cây|Lá cây|Hạt giống|Nấm|Rêu|Rong biển
Sinh nhật|Đám cưới|Tết Nguyên đán|Tết Trung thu|Lễ tốt nghiệp|Lễ hội
Nấu ăn|Đọc sách|Vẽ tranh|Chụp ảnh|Làm vườn|Câu cá
Đánh răng|Rửa bát|Giặt quần áo|Quét nhà|Tưới cây|Gói quà
Robot|Tên lửa|Vệ tinh|Trạm vũ trụ|Kính thiên văn|Phi hành gia
Kim tự tháp|Vạn Lý Trường Thành|Tháp Eiffel|Chùa Một Cột|Vịnh Hạ Long|Hồ Gươm
Con rồng|Nàng tiên cá|Người tuyết|Phù thủy|Ma cà rồng|Kỳ lân
Bưu thiếp|Phong bì|Con tem|Vé tàu|Hộ chiếu|Vali'''
words=[w for row in rows.splitlines() for w in row.split('|')]
assert len(words)==252 and len(set(words))==252
random.Random(9242026).shuffle(words)
W,H=744,1039 # 63 x 88 mm at 300 dpi
files=[]
def font(s,b=False):return ImageFont.truetype(B if b else F,s)
def tx(im,xy,t,s=30,c=INK,b=False,anchor=None):
 d=ImageDraw.Draw(im);d.text(xy,t,font=font(s,b),fill=c,anchor=anchor)
def fitted(im,xy,t,maxw,s=40,c=INK,b=False,anchor=None):
 while ImageDraw.Draw(im).textlength(t,font=font(s,b))>maxw:s-=1
 tx(im,xy,t,s,c,b,anchor)
def save(im,rel):
 p=R/rel;p.parent.mkdir(parents=True,exist_ok=True);buf=io.BytesIO();im.save(buf,format="PNG",dpi=(300,300));tmp=p.with_suffix(".tmp");tmp.write_bytes(buf.getvalue());os.replace(tmp,p);files.append(rel)
def base(label):
 im=Image.new('RGB',(W,H),CREAM);d=ImageDraw.Draw(im)
 d.rectangle((0,0,W,16),fill=RED);tx(im,(48,47),'NỘI GIÁN',36,RED,True)
 tx(im,(48,106),label,19,MUTED);d.line((48,151,W-48,151),fill=INK,width=2)
 return im
cards=[]
for i in range(42):
 ws=words[i*6:i*6+6]; num=i//7+1; id=f'{i+1:03d}'
 im=base('BỘ TỪ TIẾNG VIỆT • TỰ BIÊN SOẠN');d=ImageDraw.Draw(im)
 for k,w in enumerate(ws):
  y=230+k*112;d.ellipse((48,y-24,106,y+34),fill=RED);tx(im,(77,y+5),str(k+1),29,CREAM,True,'mm')
  fitted(im,(130,y+5),w,560,37,anchor='lm')
  if k<5:d.line((130,y+59,W-48,y+59),fill='#D8CEBA',width=1)
 tx(im,(48,970),f'THẺ {id}',20,MUTED);tx(im,(W-48,970),'6 TỪ KHÓA',20,MUTED,anchor='ra')
 save(im,f'01_the_tu_khoa/insider_tu_khoa_{id}_mat_truoc.png')
 im=Image.new('RGB',(W,H),RED);d=ImageDraw.Draw(im);d.rectangle((35,35,W-36,H-36),outline=CREAM,width=3)
 tx(im,(W/2,170),'NỘI GIÁN',49,CREAM,True,'mm');tx(im,(W/2,265),'SỐ CHỌN TỪ',24,CREAM,False,'mm')
 tx(im,(W/2,540),str(num),300,CREAM,True,'mm');tx(im,(W/2,865),'TỪ KHÓA',26,CREAM,True,'mm')
 save(im,f'01_the_tu_khoa/insider_tu_khoa_{id}_mat_sau.png')
 cards.append({'id':id,'so_mat_sau':num,'tu_khoa':ws})
# Simple geometric role symbols are deterministic for consistency.
def icon(im,kind,cx=372,cy=430):
 d=ImageDraw.Draw(im)
 if kind=='master':
  d.ellipse((cx-130,cy-130,cx+130,cy+130),outline=RED,width=12)
  d.ellipse((cx-37,cy-37,cx+37,cy+37),fill=RED)
  for a,b in [(-165,0),(165,0),(0,-165),(0,165)]:d.ellipse((cx+a-9,cy+b-9,cx+a+9,cy+b+9),fill=INK)
 elif kind=='insider':
  d.polygon([(cx-160,cy),(cx,cy-95),(cx+160,cy),(cx,cy+95)],fill=RED)
  d.ellipse((cx-53,cy-53,cx+53,cy+53),fill=CREAM);d.ellipse((cx-25,cy-25,cx+25,cy+25),fill=INK)
 else:
  d.ellipse((cx-61,cy-134,cx+61,cy-12),fill=RED)
  d.rounded_rectangle((cx-112,cy+9,cx+112,cy+135),radius=55,fill=RED)
roles=[('quan_tro','QUẢN TRÒ','master',['Bạn biết đáp án.','Chỉ trả lời: Có / Không / Không biết.','Cùng nhóm tìm ra Nội gián.']),('noi_gian','NỘI GIÁN','insider',['Bạn bí mật biết đáp án.','Dẫn nhóm đoán đúng bằng câu hỏi.','Giữ kín vai trò để chiến thắng.'])]+[(f'thuong_dan_{i:02d}','THƯỜNG DÂN','common',['Bạn chưa biết đáp án.','Đặt câu hỏi để tìm từ khóa.','Quan sát và tìm ra Nội gián.']) for i in range(1,7)]
back=Image.new('RGB',(W,H),INK);d=ImageDraw.Draw(back);d.rectangle((35,35,W-36,H-36),outline=CREAM,width=3)
tx(back,(372,260),'NỘI GIÁN',52,CREAM,True,'mm');tx(back,(372,525),'?',260,RED,True,'mm');tx(back,(372,825),'VAI TRÒ BÍ MẬT',29,CREAM,True,'mm')
for name,title,kind,lines in roles:
 im=base('VAI TRÒ');icon(im,kind);tx(im,(372,665),title,49,INK,True,'mm')
 for j,line in enumerate(lines):fitted(im,(372,770+j*53),line,650,27,anchor='mm')
 save(im,f'02_the_vai_tro/insider_vai_tro_{name}_mat_truoc.png');save(back,f'02_the_vai_tro/insider_vai_tro_{name}_mat_sau.png')
# Instruction pages: original Vietnamese wording, not a scanned official rulebook.
pages=[('CHUẨN BỊ & ĐOÁN TỪ',[
('Bộ tự làm dành cho 4–8 người','42 thẻ từ khóa (252 từ mới), 8 thẻ vai trò, đồng hồ 5 phút. Đây là bộ tự biên soạn lấy cảm hứng từ Insider; không phải sản phẩm chính thức của Oink Games.'),
('01 / Chia vai trò','Với N người, lấy 1 Quản trò, 1 Nội gián và N−2 Thường dân. Cất các thẻ Thường dân thừa. Xáo và chia mỗi người 1 thẻ úp. Quản trò công khai vai; những người khác giữ bí mật.'),
('02 / Chọn đáp án','Mọi người nhắm mắt. Quản trò lật thẻ đầu chồng từ khóa. Số ở mặt sau thẻ kế tiếp chọn dòng 1–6 trên thẻ vừa lật. Quản trò ghi nhớ đáp án và để thẻ ở nơi Nội gián có thể nhìn.'),
('03 / Nội gián xem từ','Quản trò nhắm mắt và gọi Nội gián mở mắt xem đáp án. Sau khoảng 5 giây, Nội gián nhắm mắt. Quản trò mở mắt, che thẻ từ khóa rồi gọi mọi người mở mắt.'),
('04 / Đoán trong 5 phút','Bắt đầu đồng hồ 5 phút. Thường dân và Nội gián cùng đặt câu hỏi. Quản trò chỉ đáp “Có”, “Không” hoặc “Không biết”. Nội gián dẫn dắt kín đáo. Hết giờ chưa đoán đúng: tất cả cùng thua.'),
('Khi có người đoán đúng','Ghi nhớ người đầu tiên nói đúng đáp án. Giữ nguyên đồng hồ cho cát chảy hết; cả nhóm có thể bắt đầu trao đổi. Tiếp tục theo trang 2.')]),
('THẢO LUẬN & BIỂU QUYẾT',[
('05 / Thảo luận','Khi cát đã chảy hết, lật lại để có thêm 5 phút thảo luận. Quản trò cũng tham gia. Cùng xem ai đặt câu hỏi quá chính xác, ai dẫn hướng đáng ngờ. Có thể kết thúc sớm nếu mọi người đồng ý.'),
('06 / Xét người đoán đúng','Những người còn lại, gồm Quản trò, biểu quyết xem người đoán đúng đầu tiên có phải Nội gián không. Chính người bị xét không bỏ phiếu. Quá nửa số người bỏ phiếu chọn “Có” thì bị kết tội; bằng nửa hoặc ít hơn thì được tin là vô tội. Sau đó người này lật vai.'),
('Kết quả lần xét đầu','Bị kết tội và là Nội gián: Quản trò cùng Thường dân thắng. Bị kết tội nhưng là Thường dân: Nội gián thắng. Được tin vô tội nhưng là Nội gián: Nội gián thắng. Được tin vô tội và là Thường dân: chuyển sang lần bỏ phiếu cuối.'),
('07 / Bỏ phiếu cuối','Tất cả cùng chỉ một người còn giữ vai bí mật mà mình nghi là Nội gián. Người nhiều phiếu nhất bị chọn. Nếu hòa, người đoán đúng đầu tiên quyết định giữa những người đang hòa phiếu.'),
('Ai thắng?','Chọn đúng Nội gián: Quản trò và các Thường dân thắng. Chọn nhầm: Nội gián thắng. Xáo thẻ vai trò để bắt đầu ván mới; chuyển thẻ từ đã dùng xuống cuối chồng.'),
('Quy ước cho bộ tiếng Việt','Chấp nhận cách gọi địa phương hoặc từ đồng nghĩa nếu chỉ đúng cùng một đáp án. Không chấp nhận một nhóm rộng thay cho vật cụ thể. Cả nhóm thống nhất quy ước này trước khi chơi.')]),
('IN ẤN & DANH MỤC',[
('50 thẻ vật lý • 100 ảnh hai mặt','Thẻ từ khóa: 42 mặt trước riêng và 42 mặt sau theo cặp. Mỗi số 1–6 xuất hiện 7 lần ở mặt sau. Vai trò: 8 mặt trước, 8 mặt sau giống hệt nhau. Sáu thẻ Thường dân có nội dung giống nhau.'),
('Kích thước tự chọn','Mỗi ảnh thẻ 744 × 1039 px, tương đương khoảng 63 × 88 mm tại 300 dpi. Đây là kích thước thiết kế của bộ tự làm, không phải số đo xác nhận của bản gốc. Ảnh không có vùng tràn lề.'),
('In thử và ghép mặt','In ở kích thước thực, không tự co giãn. Ghép mặt trước và mặt sau cùng mã 001–042. In thử một thẻ để kiểm tra hướng lật trước khi in cả bộ. In trên giấy đục, hoặc dùng lõi thẻ và bọc bài để không nhìn xuyên vai trò.'),
('Phụ kiện','Có ảnh đồng hồ cát và nhãn hộp. Ảnh đồng hồ không đo thời gian: dùng đồng hồ cát thật 5 phút hoặc điện thoại. Nhãn hộp là hình phẳng để dán lên hộp có sẵn, không phải khuôn hộp gấp. Không cần bàn chơi, xúc xắc hay quân điểm.'),
('Dữ liệu và tệp','Thư mục 01: thẻ từ khóa. 02: vai trò. 03: phụ kiện và nhãn hộp. 04: ba trang hướng dẫn PNG. 05: danh sách từ JSON và CSV UTF-8. Tệp README ghi quy cách và nguồn đối chiếu.'),
('Tính chất bộ này','Từ khóa và bố cục được tự biên soạn bằng tiếng Việt. Không sao chép danh sách từ thương mại, không dùng logo Oink Games. Tên Insider chỉ dùng để nhận diện trò chơi tham chiếu.')])]
def wrap(s,width,size):
 result=[];line='';d=ImageDraw.Draw(Image.new('RGB',(1,1)))
 for w in s.split():
  test=(line+' '+w).strip()
  if d.textlength(test,font=font(size))>width:result.append(line);line=w
  else:line=test
 if line:result.append(line)
 return result
for p,(title,sections) in enumerate(pages,1):
 im=Image.new('RGB',(1654,2339),CREAM);d=ImageDraw.Draw(im);d.rectangle((0,0,1654,25),fill=RED)
 tx(im,(100,90),'NỘI GIÁN',57,RED,True);tx(im,(100,180),title,42,INK,True);y=285
 for head,body in sections:
  tx(im,(100,y),head,33,RED,True);y+=55
  for line in wrap(body,1454,30):tx(im,(100,y),line,30);y+=45
  y+=45
 assert y<2240,(p,y)
 tx(im,(100,2250),'BỘ TIẾNG VIỆT TỰ LÀM',23,MUTED);tx(im,(1554,2250),f'{p} / 3',23,MUTED,anchor='ra')
 save(im,f'04_huong_dan/insider_huong_dan_{p:02d}.png')
(R/'05_du_lieu/insider_252_tu_khoa.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2),encoding='utf-8')
with (R/'05_du_lieu/insider_252_tu_khoa.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['ma_the','so_mat_sau','dong','tu_khoa'])
 for c in cards:
  for j,t in enumerate(c['tu_khoa'],1):w.writerow([c['id'],c['so_mat_sau'],j,t])
# Box labels, typography-based flat designs; no official logo.
im=Image.new('RGB',(1200,1600),RED);d=ImageDraw.Draw(im);d.rectangle((45,45,1154,1554),outline=CREAM,width=4)
tx(im,(600,240),'NỘI',150,CREAM,True,'mm');tx(im,(600,440),'GIÁN',150,CREAM,True,'mm')
d.polygon([(200,800),(600,590),(1000,800),(600,1010)],fill=INK);d.ellipse((485,685,715,915),fill=CREAM);d.ellipse((547,747,653,853),fill=RED)
tx(im,(600,1160),'AI ĐÃ BIẾT ĐÁP ÁN?',46,CREAM,True,'mm');tx(im,(600,1290),'4–8 NGƯỜI  /  KHOẢNG 15 PHÚT',30,CREAM,False,'mm');tx(im,(600,1450),'BỘ TIẾNG VIỆT TỰ LÀM',28,CREAM,False,'mm')
save(im,'03_phu_kien/insider_nhan_hop_mat_truoc.png')
im=Image.new('RGB',(1200,1600),CREAM);tx(im,(85,100),'NỘI GIÁN',85,RED,True);y=290
for title,body in [('HỎI ĐỂ TÌM TỪ','Cả nhóm cùng đoán một đáp án. Nhưng có một người đã biết từ trước…'),('NHÌN ĐỂ TÌM NGƯỜI','Ai đang âm thầm dẫn dắt những câu hỏi? Tìm đúng từ chưa phải là kết thúc.'),('TRONG BỘ TỰ LÀM','42 thẻ từ khóa • 252 từ tiếng Việt\n1 Quản trò • 1 Nội gián • 6 Thường dân\n3 trang hướng dẫn'),('CHUẨN BỊ THÊM','Đồng hồ cát 5 phút hoặc bộ đếm giờ trên điện thoại.')]:
 tx(im,(85,y),title,36,RED,True);y+=70
 for para in body.split('\n'):
  for line in wrap(para,1030,34):tx(im,(85,y),line,34);y+=55
 y+=60
for line in wrap('Lấy cảm hứng từ Insider của Oink Games. Từ khóa và thiết kế tự biên soạn; không phải bản phát hành chính thức.',1030,24):tx(im,(85,y),line,24,MUTED);y+=40
save(im,'03_phu_kien/insider_nhan_hop_mat_sau.png')
(R/'README.txt').write_text('''NỘI GIÁN — BỘ TIẾNG VIỆT TỰ LÀM
42 thẻ từ khóa, 252 từ khác nhau; 8 thẻ vai trò (1 Quản trò, 1 Nội gián, 6 Thường dân).
Mỗi thẻ có tệp mặt trước và mặt sau riêng. Tổng cộng 100 ảnh thẻ.
Thẻ 744×1039 px, 300 dpi, khoảng 63×88 mm; không có bleed. Kích thước tự chọn.
Mặt sau từ khóa: 1–6, mỗi số 7 lần. Các mặt sau vai trò giống hệt nhau.
Ba trang hướng dẫn PNG: đọc theo thứ tự 01–03.
Hai nhãn hộp là hình phẳng, không phải khuôn gấp. In kích thước tùy hộp có sẵn.
Ảnh đồng hồ cát chỉ là hình minh họa; phải dùng đồng hồ thật hoặc timer 5 phút.
CSV và JSON lưu đúng các từ được in lên thẻ. Mã thẻ giúp ghép hai mặt.
Bộ từ mới, không phải bản dịch danh sách từ gốc. Không phải sản phẩm chính thức của Oink Games.
Nguồn đối chiếu thành phần/cách chơi:
https://oinkgames.com/en/games/analog/insider/
https://shop.hachetteboardgames.co.uk/products/insider
https://boardgame-record.blogspot.com/2016/12/insider.html
https://boardgamegeek.com/thread/1762367/question-about-how-ties-work
https://www.ultraboardgames.com/insider/game-rules.php
Công cụ: bố cục chữ và biểu tượng hình học được dựng bằng mã; hình đồng hồ cát bằng công cụ tạo ảnh tích hợp.
''',encoding='utf-8')
print(json.dumps({'words':len(words),'cards':len(cards),'pngs_so_far':len(files)},ensure_ascii=False))
