import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function SignBody({ body }: { body: string }) {
  return (
    <article className="rounded-xl border border-[#27272a] bg-[#0f0f12] px-6 py-6 text-sm leading-relaxed text-[#e4e4e7] [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-[#fafafa] [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#fafafa] [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#fafafa] [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_strong]:text-[#fafafa] [&_strong]:font-semibold [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-[#27272a] [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-[#27272a] [&_td]:px-2 [&_td]:py-1 [&_hr]:border-t [&_hr]:border-[#27272a] [&_hr]:my-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </article>
  );
}
