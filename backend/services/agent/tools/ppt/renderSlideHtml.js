const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const mainText = (slide) => escapeHtml(slide.keyMessage || slide.highlight || slide.quote || slide.title);
const supportText = (slide) => escapeHtml(slide.supportingText || slide.description || slide.caption || slide.subtitle || slide.points?.[0] || "");
const image = (visual, className = "h-full w-full object-cover") => visual ? `<img src="${escapeHtml(visual.url)}" alt="${escapeHtml(visual.alt)}" class="${className}" loading="eager" decoding="sync" onerror="this.style.display='none'" />` : "";
const eyebrow = (slide) => `<p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]">${escapeHtml(slide.eyebrow || slide.purpose || "Perspective")}</p>`;
const heading = (slide, classes = "text-[52px]") => `<h2 class="${classes} font-serif font-normal leading-[0.98] tracking-[-0.025em] text-[#F5F5F5]">${mainText(slide)}</h2>`;
const paragraph = (slide, classes = "max-w-[330px]") => supportText(slide) ? `<p class="${classes} text-[15px] leading-[1.55] text-[#A3A3A3]">${supportText(slide)}</p>` : "";
const accent = () => `<div class="h-px w-16 bg-[#D4AF37]"></div>`;
const footer = (slide) => `<div class="pointer-events-none absolute bottom-6 left-10 right-10 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-[#737373]"><span>Sphere Editorial</span><span>${escapeHtml(slide.slideId?.replace("slide-", "") || "01")}</span></div>`;
const editorialCopy = (slide) => `<div class="flex min-w-0 flex-col justify-center px-12 py-14">${eyebrow(slide)}<div class="mt-7">${heading(slide)}</div><div class="mt-7">${accent()}</div><div class="mt-6">${paragraph(slide)}</div></div>`;

const concepts = (slide, count) => {
  const items = slide.items || slide.steps || slide.nodes || (slide.points || []).map((point, index) => ({ label: point, description: "", value: String(index + 1).padStart(2, "0") }));
  return `<div class="grid flex-1 ${count === 4 ? "grid-cols-4" : "grid-cols-3"} gap-7">${items.slice(0, count).map((item, index) => `<div class="border-t border-[#393939] pt-5"><span class="font-serif text-[32px] text-[#D4AF37]">${escapeHtml(item.value || item.number || String(index + 1).padStart(2, "0"))}</span><h3 class="mt-5 text-[17px] font-semibold text-[#F5F5F5]">${escapeHtml(item.label || item.title || "")}</h3><p class="mt-3 text-[12px] leading-relaxed text-[#A3A3A3]">${escapeHtml(item.description || "")}</p></div>`).join("")}</div>`;
};

export const renderSlideHtml = (slide) => {
  const visual = slide.visual?.required && slide.visual.url ? slide.visual : undefined;
  const layout = slide.layout || (slide.type === "cover" ? "hero" : slide.type === "takeaway" ? "closing" : visual?.placement === "left" ? "image-left" : visual ? "image-right" : "editorial");
  let body;
  if (["hero", "image-right", "image-left", "split-content", "editorial", "image-caption"].includes(layout) && visual) {
    const picture = `<figure class="relative m-7 overflow-hidden rounded-[18px] bg-[#171717]">${image(visual)}<div class="absolute inset-0 ring-1 ring-inset ring-white/10"></div></figure>`;
    body = `<div class="grid h-full grid-cols-[55%_45%]">${layout === "image-left" ? picture + editorialCopy(slide) : editorialCopy(slide) + picture}</div>`;
  } else if (["full-bleed-image", "text-overlay", "gallery"].includes(layout) && visual) {
    body = `<div class="relative h-full">${image(visual)}<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-black/5"></div><div class="absolute inset-y-0 left-0 flex w-[58%] flex-col justify-center px-12">${eyebrow(slide)}<div class="mt-7">${heading(slide, "text-[56px]")}</div><div class="mt-7">${accent()}</div><div class="mt-5">${paragraph(slide, "max-w-[350px] text-[#D4D4D4]")}</div></div>`;
  } else if (layout === "big-number") {
    const value = escapeHtml(slide.items?.[0]?.value || slide.highlight || slide.title);
    body = `<div class="grid h-full grid-cols-[58%_42%] px-12 py-14"><div class="flex flex-col justify-center">${eyebrow(slide)}<div class="mt-5 font-serif text-[112px] leading-none text-[#D4AF37]">${value}</div></div><div class="flex flex-col justify-center border-l border-[#333] pl-10">${heading(slide, "text-[38px]")}<div class="mt-6">${paragraph(slide, "max-w-[270px]")}</div></div></div>`;
  } else if (["three-cards", "four-cards", "stat-grid"].includes(layout)) {
    body = `<div class="flex h-full flex-col px-12 py-12">${eyebrow(slide)}<div class="mt-5 max-w-[620px]">${heading(slide, "text-[42px]")}</div><div class="mt-10 flex flex-1">${concepts(slide, layout === "four-cards" ? 4 : 3)}</div></div>`;
  } else if (layout === "comparison" || slide.type === "comparison" || slide.type === "pros_cons") {
    const left = slide.left || { title: "Strengths", points: slide.pros || [] };
    const right = slide.right || { title: "Trade-offs", points: slide.cons || [] };
    const column = (item, index) => `<div class="border-t ${index ? "border-[#555]" : "border-[#D4AF37]"} pt-5"><span class="text-[10px] uppercase tracking-[0.24em] text-[#D4AF37]">0${index + 1}</span><h3 class="mt-4 font-serif text-[30px] text-[#F5F5F5]">${escapeHtml(item.title)}</h3><div class="mt-5 space-y-3 text-[13px] text-[#A3A3A3]">${item.points.slice(0, 4).map((point) => `<p>${escapeHtml(point)}</p>`).join("")}</div></div>`;
    body = `<div class="h-full px-12 py-12">${eyebrow(slide)}<div class="mt-4">${heading(slide, "text-[40px]")}</div><div class="mt-9 grid grid-cols-2 gap-14">${column(left, 0)}${column(right, 1)}</div></div>`;
  } else if (["timeline", "process"].includes(layout) || ["timeline", "process"].includes(slide.type)) {
    const items = slide.events || slide.steps || [];
    body = `<div class="flex h-full flex-col px-12 py-12">${eyebrow(slide)}<div class="mt-4">${heading(slide, "text-[40px]")}</div><div class="relative mt-14 grid flex-1 gap-5" style="grid-template-columns:repeat(${Math.max(1, Math.min(items.length, 6))},minmax(0,1fr))"><div class="absolute left-0 right-0 top-3 h-px bg-[#3A3A3A]"></div>${items.slice(0, 6).map((item, index) => `<div class="relative"><span class="relative z-10 block h-6 w-6 rounded-full border-4 border-[#0B0B0B] bg-[#D4AF37]"></span><p class="mt-5 text-[10px] uppercase tracking-widest text-[#D4AF37]">${escapeHtml(item.date || item.number || index + 1)}</p><h3 class="mt-3 text-[15px] font-semibold text-[#F5F5F5]">${escapeHtml(item.title)}</h3><p class="mt-2 text-[11px] leading-relaxed text-[#A3A3A3]">${escapeHtml(item.description)}</p></div>`).join("")}</div></div>`;
  } else if (["quote", "closing"].includes(layout)) {
    body = `<div class="flex h-full flex-col justify-center px-20">${eyebrow(slide)}<div class="mt-8 max-w-[680px]">${heading(slide, layout === "closing" ? "text-[60px]" : "text-[52px] italic")}</div><div class="mt-8">${accent()}</div><div class="mt-6">${paragraph(slide, "max-w-[500px]")}</div></div>`;
  } else {
    body = `<div class="h-full">${editorialCopy(slide)}</div>`;
  }
  return `<div data-layout="${layout}" data-density="${escapeHtml(slide.density || "medium")}" class="relative h-[450px] w-[800px] overflow-hidden bg-[#0B0B0B] font-sans text-[#F5F5F5]">${body}${footer(slide)}</div>`;
};
