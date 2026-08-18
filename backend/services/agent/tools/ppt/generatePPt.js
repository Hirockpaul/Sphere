import pptxgen from "pptxgenjs";

const cleanColor = (value, fallback) => {
  const color = String(value || "").replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(color) ? color : fallback;
};

const addTitle = (ppt, slide, title, colors, index) => {
  slide.background = { color: colors.background };
  slide.addText(title, { x: 0.65, y: 0.35, w: 11.7, h: 0.5, fontFace: "Georgia", fontSize: 25, bold: false, color: colors.text, margin: 0, breakLine: false, fit: "shrink" });
  slide.addShape(ppt.ShapeType.line, { x: 0.65, y: 1.02, w: 12, h: 0, line: { color: colors.accent, width: 2 } });
  slide.addText(String(index + 1).padStart(2, "0"), { x: 12.1, y: 7.1, w: 0.5, h: 0.18, align: "right", fontSize: 8, color: colors.muted, margin: 0 });
};

const addPointList = (slide, points, x, y, w, h, colors) => {
  const items = points.slice(0, 7).map((point) => ({ text: point, options: { bullet: { indent: 14 }, hanging: 4, breakLine: true } }));
  slide.addText(items, { x, y, w, h, fontFace: "Arial", fontSize: 16, color: colors.text, breakLine: false, margin: 0.08, paraSpaceAfterPt: 10, valign: "mid", fit: "shrink" });
};

const addCards = (ppt, slide, items, colors, formatter) => {
  const count = Math.min(items.length, 6);
  const columns = count <= 3 ? count : 3;
  const rows = Math.ceil(count / columns);
  const gap = 0.25;
  const width = (12 - gap * (columns - 1)) / columns;
  const height = (5.35 - gap * (rows - 1)) / rows;
  items.slice(0, 6).forEach((item, index) => {
    const x = 0.66 + (index % columns) * (width + gap);
    const y = 1.35 + Math.floor(index / columns) * (height + gap);
    slide.addShape(ppt.ShapeType.roundRect, { x, y, w: width, h: height, rectRadius: 0.06, fill: { color: colors.surface }, line: { color: colors.border, width: 1 } });
    formatter(item, { x, y, w: width, h: height }, index);
  });
};

const addVisual = (slide, data, options = {}) => {
  if (!data.visual?.required || !data.imageData) return false;
  slide.addImage({ data: data.imageData, x: options.x ?? 8.45, y: options.y ?? 1.35, w: options.w ?? 4.2, h: options.h ?? 5.35, transparency: options.transparency });
  return true;
};

const storyText = (data) => data.keyMessage || data.highlight || data.quote || data.title;
const supportingText = (data) => data.supportingText || data.description || data.caption || data.subtitle || data.points?.[0] || "";
const addEyebrow = (slide, data, x, y, w, color) => slide.addText(String(data.eyebrow || data.purpose || "").toUpperCase(), { x, y, w, h: 0.25, fontSize: 9, bold: true, charSpacing: 2.2, color, margin: 0 });

const renderStoryLayout = (ppt, slide, data, colors) => {
  const layout = data.layout;
  if (!layout) return false;
  slide.background = { color: colors.background };
  if (["hero", "full-bleed-image", "text-overlay"].includes(layout) && data.imageData) {
    addVisual(slide, data, { x: 0, y: 0, w: 13.333, h: 7.5, transparency: 15 });
    slide.addShape(ppt.ShapeType.rect, { x: 0, y: 0, w: 7.8, h: 7.5, fill: { color: "111111", transparency: 18 }, line: { transparency: 100 } });
    addEyebrow(slide, data, 0.85, 1.05, 5.8, "F5C16C");
    slide.addText(storyText(data), { x: 0.85, y: 1.65, w: 6.3, h: 2.5, fontSize: 37, bold: true, color: "FFFFFF", margin: 0, breakLine: false, fit: "shrink", valign: "mid" });
    slide.addText(supportingText(data), { x: 0.88, y: 4.55, w: 5.5, h: 1.15, fontSize: 15, color: "E5E5E5", margin: 0, fit: "shrink" });
    return true;
  }
  if (layout === "hero") {
    addEyebrow(slide, data, 0.9, 1.2, 11.4, colors.accent);
    slide.addText(storyText(data), { x: 0.85, y: 1.85, w: 10.9, h: 2.35, fontSize: 43, bold: true, color: colors.text, margin: 0, fit: "shrink", valign: "mid" });
    slide.addText(supportingText(data), { x: 0.9, y: 4.65, w: 7.4, h: 0.9, fontSize: 17, color: colors.muted, margin: 0, fit: "shrink" });
    slide.addShape(ppt.ShapeType.line, { x: 10.7, y: 1.2, w: 1.6, h: 0, line: { color: colors.accent, width: 5 } });
    return true;
  }
  if (["image-left", "image-right", "editorial", "image-caption", "split-content"].includes(layout) && data.imageData) {
    const leftImage = layout === "image-left" || layout === "editorial";
    const imageX = leftImage ? 0 : 7.35;
    addVisual(slide, data, { x: imageX, y: 0, w: 5.98, h: 7.5 });
    const x = leftImage ? 6.65 : 0.8;
    addEyebrow(slide, data, x, 1.15, 5.6, colors.accent);
    slide.addText(storyText(data), { x, y: 1.75, w: 5.7, h: 2.1, fontSize: 31, bold: true, color: colors.text, margin: 0, fit: "shrink", valign: "mid" });
    slide.addText(supportingText(data), { x, y: 4.25, w: 5.25, h: 1.35, fontSize: 15, color: colors.muted, margin: 0, fit: "shrink" });
    return true;
  }
  if (layout === "big-number") {
    const value = data.items?.[0]?.value || data.highlight || data.title;
    addEyebrow(slide, data, 0.85, 0.85, 11.5, colors.accent);
    slide.addText(value, { x: 0.75, y: 1.35, w: 11.8, h: 2.45, fontSize: 76, bold: true, color: colors.accent, margin: 0, fit: "shrink" });
    slide.addText(storyText(data), { x: 0.85, y: 4.1, w: 8.7, h: 1.1, fontSize: 28, bold: true, color: colors.text, margin: 0, fit: "shrink" });
    slide.addText(supportingText(data), { x: 9.6, y: 4.18, w: 2.85, h: 1.4, fontSize: 13, color: colors.muted, margin: 0, fit: "shrink" });
    return true;
  }
  if (["three-cards", "four-cards", "stat-grid"].includes(layout)) {
    const source = data.items || data.steps || data.nodes || (data.points || []).map((point, index) => ({ value: String(index + 1).padStart(2, "0"), label: point, description: "" }));
    const count = Math.min(source.length, layout === "four-cards" ? 4 : 3);
    addEyebrow(slide, data, 0.75, 0.55, 11.8, colors.accent);
    slide.addText(storyText(data), { x: 0.72, y: 0.92, w: 11.9, h: 0.65, fontSize: 27, bold: true, color: colors.text, margin: 0, fit: "shrink" });
    const gap = 0.22;
    const width = (11.9 - gap * (count - 1)) / count;
    source.slice(0, count).forEach((item, index) => {
      const x = 0.72 + index * (width + gap);
      slide.addShape(ppt.ShapeType.rect, { x, y: 1.85, w: width, h: 4.75, fill: { color: colors.surface }, line: { color: colors.border, width: 1 } });
      slide.addText(String(item.value || item.number || item.label || item.title || index + 1), { x: x + 0.28, y: 2.25, w: width - 0.56, h: 0.8, fontSize: 28, bold: true, color: colors.accent, margin: 0, fit: "shrink" });
      slide.addText(item.label || item.title || "", { x: x + 0.28, y: 3.35, w: width - 0.56, h: 0.75, fontSize: 17, bold: true, color: colors.text, margin: 0, fit: "shrink" });
      slide.addText(item.description || "", { x: x + 0.28, y: 4.35, w: width - 0.56, h: 1.35, fontSize: 12, color: colors.muted, margin: 0, fit: "shrink" });
    });
    return true;
  }
  if (layout === "gallery" && data.imageData) {
    addVisual(slide, data, { x: 0.55, y: 0.55, w: 8.45, h: 6.4 });
    addEyebrow(slide, data, 9.45, 1.15, 3.1, colors.accent);
    slide.addText(storyText(data), { x: 9.45, y: 1.75, w: 3.1, h: 2.2, fontSize: 27, bold: true, color: colors.text, margin: 0, fit: "shrink" });
    slide.addText(supportingText(data), { x: 9.45, y: 4.35, w: 3.05, h: 1.25, fontSize: 13, color: colors.muted, margin: 0, fit: "shrink" });
    return true;
  }
  if (["quote", "closing"].includes(layout)) {
    addEyebrow(slide, data, 2.15, 1.2, 9, colors.accent);
    slide.addText(storyText(data), { x: 1.25, y: 2, w: 10.85, h: 2.7, fontSize: layout === "closing" ? 38 : 34, bold: layout === "closing", italic: layout === "quote", align: "center", valign: "mid", color: colors.text, margin: 0.05, fit: "shrink" });
    slide.addText(supportingText(data), { x: 2.4, y: 5.2, w: 8.55, h: 0.75, fontSize: 14, align: "center", color: colors.muted, margin: 0, fit: "shrink" });
    return true;
  }
  return false;
};

const renderSlide = (ppt, slide, data, colors, index) => {
  if (renderStoryLayout(ppt, slide, data, colors)) return;
  addTitle(ppt, slide, data.title, colors, index);
  if (!["content", "takeaway", "image"].includes(data.type)) {
    addVisual(slide, data, { x: 0, y: 1.04, w: 13.333, h: 6.46, transparency: data.visual?.placement === "background" ? 52 : 78 });
  }
  if (["content", "takeaway"].includes(data.type)) {
    const hasVisual = addVisual(slide, data);
    addPointList(slide, data.points, 0.9, 1.35, hasVisual ? 7.05 : 11.5, 5.35, colors);
  } else if (["comparison", "pros_cons"].includes(data.type)) {
    const left = data.left || { title: "Benefits", points: data.pros };
    const right = data.right || { title: "Limitations", points: data.cons };
    [[left, 0.7, colors.primary], [right, 6.85, colors.secondary]].forEach(([side, x, accent]) => {
      slide.addShape(ppt.ShapeType.roundRect, { x, y: 1.35, w: 5.8, h: 5.25, fill: { color: colors.surface }, line: { color: accent, width: 1.5 } });
      slide.addText(side.title, { x: x + 0.3, y: 1.65, w: 5.2, h: 0.4, fontSize: 20, bold: true, color: accent, margin: 0 });
      addPointList(slide, side.points, x + 0.3, 2.2, 5.1, 3.95, colors);
    });
  } else if (data.type === "table") {
    const rows = [data.columns.map((value) => ({ text: value, options: { bold: true, color: "FFFFFF", fill: colors.primary } })), ...data.rows];
    slide.addTable(rows, { x: 0.7, y: 1.35, w: 12, h: 5.4, border: { type: "solid", color: colors.border, pt: 1 }, color: colors.text, fill: colors.surface, fontSize: 12, margin: 0.08, autoFit: false, valign: "mid" });
  } else if (data.type === "chart") {
    const chartTypes = { bar: ppt.ChartType.bar, line: ppt.ChartType.line, pie: ppt.ChartType.pie, doughnut: ppt.ChartType.doughnut, scatter: ppt.ChartType.scatter, radar: ppt.ChartType.radar };
    const series = data.series.map((item) => ({ name: item.name, labels: data.categories, values: item.values }));
    slide.addChart(chartTypes[data.chartType], series, { x: 0.8, y: 1.35, w: 8.5, h: 5.25, showLegend: true, showTitle: false, showValue: data.chartType === "pie" || data.chartType === "doughnut", chartColors: [colors.primary, colors.accent, colors.secondary] });
    slide.addText(data.description, { x: 9.65, y: 2, w: 2.8, h: 3.5, fontSize: 15, color: colors.text, margin: 0.15, valign: "mid", fit: "shrink" });
  } else if (data.type === "kpi") {
    addCards(ppt, slide, data.items, colors, (item, box) => {
      slide.addText(item.value, { x: box.x + 0.2, y: box.y + 0.35, w: box.w - 0.4, h: 0.65, fontSize: 28, bold: true, align: "center", color: colors.accent, margin: 0, fit: "shrink" });
      slide.addText(item.label, { x: box.x + 0.2, y: box.y + 1.1, w: box.w - 0.4, h: 0.4, fontSize: 16, bold: true, align: "center", color: colors.text, margin: 0 });
      slide.addText(item.description, { x: box.x + 0.25, y: box.y + 1.65, w: box.w - 0.5, h: box.h - 1.9, fontSize: 12, align: "center", color: colors.muted, margin: 0.05, fit: "shrink" });
    });
  } else if (["process", "timeline"].includes(data.type)) {
    const items = data.steps || data.events;
    const width = 11.8 / items.length;
    slide.addShape(ppt.ShapeType.line, { x: 0.85, y: 3.35, w: 11.55, h: 0, line: { color: colors.border, width: 2 } });
    items.forEach((item, i) => {
      const x = 0.75 + i * width;
      slide.addShape(ppt.ShapeType.ellipse, { x: x + width / 2 - 0.22, y: 3.12, w: 0.44, h: 0.44, fill: { color: colors.accent }, line: { color: colors.accent } });
      slide.addText(String(item.number ?? item.date), { x, y: 2.25, w: width, h: 0.45, align: "center", bold: true, fontSize: 12, color: colors.accent, margin: 0, fit: "shrink" });
      slide.addText(item.title, { x, y: 3.8, w: width, h: 0.45, align: "center", bold: true, fontSize: 14, color: colors.text, margin: 0, fit: "shrink" });
      slide.addText(item.description, { x: x + 0.08, y: 4.35, w: width - 0.16, h: 1.2, align: "center", fontSize: 10, color: colors.muted, margin: 0.03, fit: "shrink" });
    });
  } else if (data.type === "architecture") {
    const height = 4.9 / data.layers.length;
    data.layers.forEach((layer, i) => {
      const y = 1.35 + i * (height + 0.12);
      slide.addShape(ppt.ShapeType.roundRect, { x: 0.8, y, w: 2.2, h: height, fill: { color: colors.primary }, line: { color: colors.primary } });
      slide.addText(layer.title, { x: 1, y: y + 0.15, w: 1.8, h: height - 0.3, align: "center", valign: "mid", bold: true, fontSize: 15, color: "FFFFFF", margin: 0.05, fit: "shrink" });
      const componentWidth = 9 / layer.components.length;
      layer.components.forEach((component, j) => {
        const x = 3.35 + j * componentWidth;
        slide.addShape(ppt.ShapeType.roundRect, { x, y, w: componentWidth - 0.18, h: height, fill: { color: colors.surface }, line: { color: colors.border } });
        slide.addText(component, { x: x + 0.08, y: y + 0.1, w: componentWidth - 0.34, h: height - 0.2, align: "center", valign: "mid", fontSize: 13, color: colors.text, margin: 0.03, fit: "shrink" });
      });
    });
  } else if (data.type === "diagram") {
    addCards(ppt, slide, data.nodes, colors, (node, box) => {
      slide.addText(node.label, { x: box.x + 0.2, y: box.y + 0.25, w: box.w - 0.4, h: 0.45, align: "center", bold: true, fontSize: 16, color: colors.accent, margin: 0, fit: "shrink" });
      slide.addText(node.description, { x: box.x + 0.2, y: box.y + 0.85, w: box.w - 0.4, h: box.h - 1.1, align: "center", fontSize: 11, color: colors.text, margin: 0.04, fit: "shrink" });
    });
  } else if (data.type === "code") {
    slide.addText(data.code, { x: 0.75, y: 1.35, w: 7.7, h: 5.3, fontFace: "Courier New", fontSize: 12, color: "E2E8F0", fill: { color: "0F172A" }, margin: 0.2, breakLine: false, fit: "shrink" });
    addPointList(slide, data.explanation, 8.8, 1.65, 3.7, 4.7, colors);
  } else if (data.type === "example") {
    addCards(ppt, slide, [{ label: "Problem", value: data.problem }, { label: "Solution", value: data.solution }, { label: "Result", value: data.result }], colors, (item, box) => {
      slide.addText(item.label, { x: box.x + 0.2, y: box.y + 0.3, w: box.w - 0.4, h: 0.45, bold: true, align: "center", fontSize: 18, color: colors.accent, margin: 0 });
      slide.addText(item.value, { x: box.x + 0.25, y: box.y + 1, w: box.w - 0.5, h: box.h - 1.3, align: "center", valign: "mid", fontSize: 14, color: colors.text, margin: 0.05, fit: "shrink" });
    });
  } else if (["quote", "highlight"].includes(data.type)) {
    const main = data.quote || data.highlight;
    slide.addText(main, { x: 1.2, y: 2, w: 10.9, h: 2, align: "center", valign: "mid", fontSize: 29, bold: data.type === "highlight", italic: data.type === "quote", color: colors.primary, margin: 0.1, fit: "shrink" });
    slide.addText(data.author || data.description, { x: 2, y: 4.35, w: 9.3, h: 0.8, align: "center", fontSize: 15, color: colors.muted, margin: 0.05, fit: "shrink" });
  } else if (data.type === "image") {
    if (!addVisual(slide, data, { x: 0.8, y: 1.35, w: 7.2, h: 4.8 })) {
      slide.addShape(ppt.ShapeType.roundRect, { x: 0.8, y: 1.35, w: 7.2, h: 4.8, fill: { color: colors.surface }, line: { color: colors.border, dash: "dash" } });
      slide.addText(`Suggested visual\n${data.imageQuery}`, { x: 1.4, y: 2.5, w: 6, h: 1.5, align: "center", valign: "mid", fontSize: 20, color: colors.muted, margin: 0.1, fit: "shrink" });
    }
    addPointList(slide, data.points, 8.35, 1.55, 4, 3.8, colors);
    slide.addText(data.caption, { x: 0.9, y: 6.25, w: 7, h: 0.35, align: "center", italic: true, fontSize: 10, color: colors.muted, margin: 0 });
  }
};

export const generatePpt = async (data) => {
  const ppt = new pptxgen();
  ppt.layout = "LAYOUT_WIDE";
  ppt.author = "Sphere";
  ppt.company = "Sphere";
  ppt.title = data.title;
  ppt.subject = data.subtitle;
  ppt.lang = "en-US";
  ppt.theme = { headFontFace: "Georgia", bodyFontFace: "Arial", lang: "en-US" };
  const colors = {
    primary: "D4AF37",
    secondary: "A3A3A3",
    accent: "D4AF37",
    background: "0B0B0B",
    text: "F5F5F5",
    muted: "A3A3A3", surface: "171717", border: "393939",
  };
  data.slides.forEach((slideData, index) => {
    const slide = ppt.addSlide();
    if (renderStoryLayout(ppt, slide, slideData, colors)) {
      return;
    } else if (slideData.type === "cover") {
      slide.background = { color: colors.background };
      addVisual(slide, slideData, { x: 0, y: 0, w: 13.333, h: 7.5, transparency: 28 });
      slide.addShape(ppt.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: colors.accent }, line: { color: colors.accent } });
      slide.addText(slideData.title, { x: 0.9, y: 2.05, w: 11.5, h: 1.5, align: "center", valign: "mid", fontSize: 34, bold: true, color: "FFFFFF", margin: 0.05, fit: "shrink" });
      slide.addText(slideData.subtitle, { x: 1.5, y: 3.8, w: 10.3, h: 0.75, align: "center", fontSize: 17, color: "E0E7FF", margin: 0.05, fit: "shrink" });
      slide.addText("SPHERE PRESENTATION", { x: 0.8, y: 1.15, w: 11.7, h: 0.3, align: "center", fontSize: 10, bold: true, color: "C7D2FE", charSpacing: 2, margin: 0 });
    } else renderSlide(ppt, slide, slideData, colors, index);
  });
  return ppt;
};
