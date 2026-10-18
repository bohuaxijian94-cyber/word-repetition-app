import type { Word } from "./domain";
import type { Review } from "./db";
import { dayKey, streak, type Practice } from "./learning";
export default function StatsPage({
  words,
  reviews,
  practice,
  listeningDays,
}: {
  words: Word[];
  reviews: Review[];
  practice: Practice[];
  listeningDays: string[];
}) {
  const records = [...reviews, ...practice];
  const counts = new Map<string, number>();
  for (const r of records)
    counts.set(dayKey(r.time), (counts.get(dayKey(r.time)) || 0) + 1);
  const today = counts.get(dayKey()) || 0;
  const days = Array.from({ length: 91 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 90 + i);
    return dayKey(date.getTime());
  });
  return (
    <>
      <div className="eyebrow">MES PROGRÈS</div>
      <h1>少しずつ、積み重ねる。</h1>
      <div className="stats">
        <div>
          <span>今日の想起練習</span>
          <strong>
            {today}
            <small>回</small>
          </strong>
          <p>朝晩クイズも含みます</p>
        </div>
        <div>
          <span>連続学習</span>
          <strong>
            {streak([
              ...records.map((r) => r.time),
              ...listeningDays.map((day) =>
                new Date(day + "T12:00:00").getTime(),
              ),
            ])}
            <small>日</small>
          </strong>
          <p>昨日まで継続中の記録も表示</p>
        </div>
        <div>
          <span>登録した語彙・文型</span>
          <strong>
            {words.length}
            <small>枚</small>
          </strong>
          <p>既知 {words.filter((w) => w.known).length} 枚</p>
        </div>
      </div>
      <section className="panel">
        <h2>学習カレンダー</h2>
        <p className="muted">
          直近91日。濃い色ほど想起練習の回数が多い日です。各マスに日付と回数を表示します。
        </p>
        <div className="heatmap" aria-label="91日間の学習記録">
          {days.map((day) => (
            <span
              key={day}
              tabIndex={0}
              role="img"
              aria-label={`${day}: ${counts.get(day) || 0}回${listeningDays.includes(day) ? "・シャドーイング完了" : ""}`}
              title={`${day}: ${counts.get(day) || 0}回${listeningDays.includes(day) ? "・シャドーイング完了" : ""}`}
              data-level={
                Math.min(4, Math.ceil((counts.get(day) || 0) / 3)) ||
                (listeningDays.includes(day) ? 1 : 0)
              }
            />
          ))}
        </div>
        <div className="heatmap-legend">
          少ない <span data-level="0" />
          <span data-level="1" />
          <span data-level="2" />
          <span data-level="3" />
          <span data-level="4" /> 多い
        </div>
      </section>
      <section className="panel">
        <h2>習熟度の目安</h2>
        {[
          [
            "未学習",
            words.filter(
              (w) => !w.known && !reviews.some((r) => r.wordId === w.id),
            ).length,
          ],
          [
            "練習中（間隔7日未満）",
            words.filter(
              (w) =>
                !w.known &&
                w.interval < 7 &&
                reviews.some((r) => r.wordId === w.id),
            ).length,
          ],
          [
            "定着中（間隔7日以上）",
            words.filter((w) => !w.known && w.interval >= 7).length,
          ],
          ["既知（復習対象外）", words.filter((w) => w.known).length],
        ].map(([label, count]) => (
          <div className="mastery-row" key={label}>
            <span>{label}</span>
            <meter
              min={0}
              max={Math.max(1, words.length)}
              value={Number(count)}
            />
            <strong>{count} 枚</strong>
          </div>
        ))}
      </section>
    </>
  );
}
