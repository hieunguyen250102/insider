/**
 * Colour vocabulary, from the printed kit: cream paper, vermilion, charcoal,
 * plus muted screen-print inks for the players. Nothing fluorescent.
 */

import type { Answer, Role } from '@shared/types';

export const INK = '#242422';
export const PAPER = '#f7f0df';
export const CREAM = '#fbf6ea';
export const RED = '#d83d31';
export const MUSTARD = '#e2a93b';
export const TEAL = '#2f7f7a';

/** The eight characters; the coat colour doubles as the player's colour. */
export const AVATARS = [
  { name: 'Mũ phớt', coat: '#d83d31', shade: '#a92f25', skin: '#f1c7a1' },
  { name: 'Mũ nồi', coat: '#e2a93b', shade: '#b98524', skin: '#e4b28b' },
  { name: 'Tóc ngắn', coat: '#2f7f7a', shade: '#22605c', skin: '#f3d0b0' },
  { name: 'Lưỡi trai', coat: '#3561a6', shade: '#274b82', skin: '#c99068' },
  { name: 'Búi tóc', coat: '#7b4b7f', shade: '#5d3860', skin: '#f1c7a1' },
  { name: 'Quả dưa', coat: '#6f8a3a', shade: '#546a2b', skin: '#e4b28b' },
  { name: 'Kính tròn', coat: '#dd7a3a', shade: '#b35e27', skin: '#f3d0b0' },
  { name: 'Tóc xoăn', coat: '#c25b76', shade: '#9a445c', skin: '#c99068' },
] as const;

export function avatarOf(i: number) {
  return AVATARS[((i % AVATARS.length) + AVATARS.length) % AVATARS.length];
}

export const ROLES: Record<Role, { label: string; color: string; deep: string; lines: string[] }> = {
  master: {
    label: 'Quản trò',
    color: TEAL,
    deep: '#22605c',
    lines: ['Bạn biết từ khóa.', 'Chỉ trả lời Có / Không / Không biết.', 'Cùng mọi người tìm ra Nội gián.'],
  },
  insider: {
    label: 'Nội gián',
    color: RED,
    deep: '#a92f25',
    lines: ['Bạn lén biết từ khóa.', 'Khéo léo dẫn cả bàn đoán ra.', 'Đừng để ai phát hiện!'],
  },
  common: {
    label: 'Thường dân',
    color: MUSTARD,
    deep: '#b98524',
    lines: ['Bạn chưa biết từ khóa.', 'Hỏi Quản trò để tìm ra nó.', 'Để ý xem ai biết trước!'],
  },
};

export const ANSWERS: Record<Answer, { label: string; color: string }> = {
  yes: { label: 'Có', color: TEAL },
  no: { label: 'Không', color: RED },
  unknown: { label: 'Không biết', color: '#8a8173' },
  correct: { label: 'Đúng rồi!', color: '#6f8a3a' },
};
