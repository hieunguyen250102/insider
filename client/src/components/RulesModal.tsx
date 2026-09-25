/** The rules in a few short sections, with the real pieces drawn alongside. */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { RoleFace } from './art/RoleCard';
import { Hourglass } from './art/Hourglass';
import { Stamp } from './art/Stamp';

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[75] flex items-center justify-center bg-night/80 px-3 py-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="paper scrollbar-thin relative max-h-full w-full max-w-lg overflow-y-auto rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-ink-soft hover:bg-paper-2"
          aria-label="Đóng"
        >
          ✕
        </button>
        <h2 className="display text-3xl font-bold uppercase tracking-wide text-ink">Luật chơi</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Như trò <b className="text-ink">20 câu hỏi</b>, nhưng một người đoán đã <b className="text-ink">biết trước đáp án</b>.
          Muốn thắng, cả bàn phải tìm ra từ khóa — rồi tìm ra kẻ đã biết từ đầu: <b className="text-vermilion">Nội gián</b>.
        </p>

        <Section title="Vai trò (4–8 người)">
          <div className="grid grid-cols-3 gap-2">
            {(['master', 'insider', 'common'] as const).map((r) => (
              <div key={r} className="flex justify-center">
                <RoleFace role={r} width={100} lookAround={false} />
              </div>
            ))}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <b className="text-teal">Quản trò</b> — công khai vai, biết từ khóa, chỉ trả lời Có / Không / Không biết.
            </li>
            <li>
              <b className="text-vermilion">Nội gián</b> — lén biết từ khóa, âm thầm dẫn dắt cả bàn đoán ra.
            </li>
            <li>
              <b className="text-mustard-deep">Thường dân</b> — chưa biết gì, vừa đoán từ vừa để ý ai biết trước.
            </li>
          </ul>
          <p className="mt-1.5">Quản trò và Thường dân cùng một phe, chống lại Nội gián.</p>
        </Section>

        <Section title="1. Nhắm mắt">
          Quản trò xem từ khóa (lấy từ thẻ như bộ in: số ở mặt sau thẻ kế tiếp chọn dòng). Rồi Quản trò nhắm mắt, Nội gián
          lén mở mắt xem từ khóa trong vài giây. Mở mắt — bắt đầu!
        </Section>

        <Section title="2. Hỏi — đáp">
          <span className="float-right ml-3">
            <Hourglass fraction={0.62} running height={78} />
          </span>
          Lật đồng hồ cát (mặc định 5 phút). Ai cũng được hỏi Quản trò câu hỏi Có/Không, hoặc <b>đoán</b> thẳng từ khóa.
          Quản trò đóng dấu:
          <span className="mt-2 flex flex-wrap gap-2">
            <Stamp answer="yes" />
            <Stamp answer="no" />
            <Stamp answer="unknown" />
            <Stamp answer="correct" />
          </span>
          <span className="mt-2 block">
            Hết cát mà chưa ai đoán ra: <b>cả bàn cùng thua</b>, kể cả Nội gián.
          </span>
        </Section>

        <Section title="3. Thảo luận">
          Khi có người đoán đúng, đồng hồ được <b>lật ngược</b>: thời gian thảo luận bằng đúng thời gian đã hỏi. Cả bàn (cả
          Quản trò) bàn xem ai đặt câu hỏi “trúng quá”. Mọi người sẵn sàng thì bỏ phiếu sớm.
        </Section>

        <Section title="4. Bỏ phiếu">
          <p>
            <b className="text-ink">Lần 1 — xét người đoán đúng.</b> Mọi người trừ người đoán bỏ phiếu: người này có phải Nội
            gián? Quá nửa số phiếu nói “Có” thì kết tội (hòa không tính). Người đoán lật vai:
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Kết tội đúng Nội gián → Quản trò &amp; Thường dân thắng.</li>
            <li>Kết tội nhầm Thường dân, hoặc tin nhầm Nội gián → Nội gián thắng.</li>
            <li>Tin đúng là Thường dân → sang lần 2.</li>
          </ul>
          <p className="mt-2">
            <b className="text-ink">Lần 2 — cùng chỉ tay.</b> Mọi người chỉ vào một người còn giấu vai. Nhiều phiếu nhất mà
            là Nội gián thì Quản trò &amp; Thường dân thắng, không thì Nội gián thắng. Hòa phiếu: người đoán đúng quyết định.
          </p>
        </Section>

        <Section title="Quy ước bản tiếng Việt">
          Gõ đoán có dấu hay không dấu đều được; “con mèo” hay “mèo” đều tính. Từ địa phương, từ đồng nghĩa chỉ đúng cùng một
          thứ thì Quản trò bấm <b>Đúng rồi!</b>. Nhóm quá rộng (“con vật” thay cho “con mèo”) thì không tính.
        </Section>

        <p className="mt-4 text-[11px] leading-relaxed text-ink-soft/80">
          Insider do Akihiro Itoh, Kito Shinzuke, Kwaji và Daichi Okano thiết kế, Oink Games phát hành. Đây là bản dựng lại
          phi thương mại để chơi cùng bạn bè, với bộ 252 từ tiếng Việt tự biên soạn. Thích thì hãy mua bản giấy nhé!
        </p>
      </motion.div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 text-sm leading-relaxed text-ink-soft">
      <h3 className="display mb-1.5 text-lg font-bold uppercase tracking-wide text-ink">{title}</h3>
      {children}
    </section>
  );
}
