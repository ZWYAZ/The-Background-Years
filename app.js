const CURRENT_YEAR = 2026;
const events = window.TIME_SLICE_EVENTS;

const phases = [
  { id: "all", label: "全部", range: [0, Infinity] },
  { id: "childhood", label: "儿童", range: [0, 17] },
  { id: "youth", label: "青年", range: [18, 44] },
  { id: "middle", label: "中年", range: [45, 59] },
  { id: "later", label: "老年", range: [60, Infinity] }
];

const state = {
  birthYear: 2000,
  phase: "all",
  categories: new Set(),
  decades: new Set()
};

const categoryAliases = {
  经济: "经济节点",
  国际节点: "国际事件",
  技术节点: "技术设施",
  体育: "文化与体育",
  体育里程碑: "文化与体育",
  文化第一次: "文化与体育",
  文化结构: "文化与体育",
  文化里程碑: "文化与体育",
  社会结构: "公共事件",
  教育结构: "公共事件"
};

const el = {
  form: document.querySelector("#yearForm"),
  birthYear: document.querySelector("#birthYear"),
  yearRange: document.querySelector("#yearRange"),
  summaryBirth: document.querySelector("#summaryBirth"),
  summaryCount: document.querySelector("#summaryCount"),
  profileTitle: document.querySelector("#profileTitle"),
  eventList: document.querySelector("#eventList"),
  emptyState: document.querySelector("#emptyState"),
  categoryFilters: document.querySelector("#categoryFilters"),
  decadeFilters: document.querySelector("#decadeFilters"),
  phaseOverview: document.querySelector("#phaseOverview"),
  phaseTabs: document.querySelector("#phaseTabs"),
  resetFilters: document.querySelector("#resetFilters")
};

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
}

function categoriesForEvent(event) {
  return uniqueSorted(event.categories.map((category) => categoryAliases[category] ?? category));
}

function eventDecade(event) {
  return Math.floor(event.year / 10) * 10;
}

function clampBirthYear(value) {
  const year = Number.parseInt(value, 10);
  if (Number.isNaN(year)) return 2000;
  return Math.min(CURRENT_YEAR, Math.max(1900, year));
}

function ageAt(event) {
  return event.year - state.birthYear;
}

function phaseForAge(age) {
  return phases.slice(1).find((phase) => age >= phase.range[0] && age <= phase.range[1]) ?? phases[0];
}

function eventsForPhase(phase) {
  return events.filter((event) => {
    const age = ageAt(event);
    return age >= phase.range[0] && age <= phase.range[1];
  });
}

function phaseYearRange(phase) {
  const startYear = state.birthYear + phase.range[0];
  const endYear = phase.range[1] === Infinity ? CURRENT_YEAR : Math.min(CURRENT_YEAR, state.birthYear + phase.range[1]);
  if (startYear > CURRENT_YEAR) return "尚未到来";
  return `${startYear}-${endYear}`;
}

function topCategories(phaseEvents) {
  const counts = new Map();
  phaseEvents.forEach((event) => {
    categoriesForEvent(event).forEach((category) => counts.set(category, (counts.get(category) ?? 0) + 1));
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, 3)
    .map(([category]) => category);
}

function phaseSentence(phase, phaseEvents) {
  if (phaseEvents.length === 0) {
    return phaseYearRange(phase) === "尚未到来"
      ? "这一阶段尚未展开，当前数据不作推断。"
      : "这一阶段暂无收录事件。";
  }

  const categories = topCategories(phaseEvents);
  return `这一阶段的背景主要由${categories.join("、")}构成。`;
}

function renderPhaseOverview() {
  el.phaseOverview.innerHTML = phases
    .slice(1)
    .map((phase) => {
      const phaseEvents = eventsForPhase(phase);
      const examples = phaseEvents
        .slice(0, 3)
        .map((event) => `<li>${event.year} · ${event.title}</li>`)
        .join("");
      const exampleBlock = examples ? `<ul>${examples}</ul>` : "";

      return `
        <article class="phase-card phase-tone-${phase.id}">
          <div class="phase-card-top">
            <strong>${phase.label}</strong>
            <span>${phase.range[0]}-${phase.range[1] === Infinity ? "∞" : phase.range[1]} 岁</span>
          </div>
          <div class="phase-years">${phaseYearRange(phase)}</div>
          <p>${phaseSentence(phase, phaseEvents)}</p>
          <div class="phase-count">${phaseEvents.length} 条背景事件</div>
          ${exampleBlock}
        </article>
      `;
    })
    .join("");
}

function isEventVisible(event) {
  const age = ageAt(event);
  if (age < 0) return false;

  const selectedPhase = phases.find((phase) => phase.id === state.phase);
  const inPhase = state.phase === "all" || (age >= selectedPhase.range[0] && age <= selectedPhase.range[1]);
  const inCategory =
    state.categories.size === 0 || categoriesForEvent(event).some((category) => state.categories.has(category));
  const inDecade = state.decades.size === 0 || state.decades.has(eventDecade(event));

  return inPhase && inCategory && inDecade;
}

function renderFilters() {
  const categories = uniqueSorted(events.flatMap(categoriesForEvent));
  const decades = uniqueSorted(events.map(eventDecade));

  el.categoryFilters.innerHTML = categories
    .map((category) => {
      const active = state.categories.has(category) ? "is-active" : "";
      return `<button class="chip ${active}" type="button" data-category="${category}">${category}</button>`;
    })
    .join("");

  el.decadeFilters.innerHTML = decades
    .map((decade) => {
      const active = state.decades.has(decade) ? "is-active" : "";
      return `<button class="chip ${active}" type="button" data-decade="${decade}">${decade}s</button>`;
    })
    .join("");
}

function renderPhases(visibleEvents) {
  const phaseCounts = phases.map((phase) => {
    const count = events.filter((event) => {
      const age = ageAt(event);
      if (age < 0) return false;
      const inCategory =
        state.categories.size === 0 || categoriesForEvent(event).some((category) => state.categories.has(category));
      const inDecade = state.decades.size === 0 || state.decades.has(eventDecade(event));
      const inPhase = phase.id === "all" || (age >= phase.range[0] && age <= phase.range[1]);
      return inCategory && inDecade && inPhase;
    }).length;
    return { ...phase, count };
  });

  el.phaseTabs.innerHTML = phaseCounts
    .map((phase) => {
      const active = phase.id === state.phase ? "is-active" : "";
      return `
        <button class="phase-tab phase-tone-${phase.id} ${active}" type="button" role="tab" data-phase="${phase.id}">
          <span>${phase.label}</span>
          <strong>${phase.count}</strong>
        </button>
      `;
    })
    .join("");

  el.summaryCount.textContent = visibleEvents.length;
}

function renderEvents() {
  const visibleEvents = events.filter(isEventVisible).sort((a, b) => a.year - b.year);
  const eventsByYear = visibleEvents.reduce((groups, event) => {
    if (!groups.has(event.year)) groups.set(event.year, []);
    groups.get(event.year).push(event);
    return groups;
  }, new Map());

  el.summaryBirth.textContent = state.birthYear;
  el.profileTitle.textContent = `${state.birthYear} 年出生者的时间底片`;
  el.birthYear.value = state.birthYear;
  el.yearRange.value = state.birthYear;

  renderPhaseOverview();
  renderPhases(visibleEvents);
  renderFilters();

  el.eventList.innerHTML = [...eventsByYear.entries()]
    .map(([year, yearEvents]) => {
      const age = year - state.birthYear;
      const phase = phaseForAge(age);
      const eventItems = yearEvents
        .map((event) => {
          const categoryTags = categoriesForEvent(event).map((category) => `<span>${category}</span>`).join("");
          const note = event.note ? `<p class="event-note">${event.note}</p>` : "";

          return `
            <article class="event-body">
              <h3>${event.title}</h3>
              ${note}
              <div class="event-tags">${categoryTags}</div>
            </article>
          `;
        })
        .join("");

      return `
        <li class="event-item phase-tone-${phase.id}">
          <div class="event-year phase-tone-${phase.id}">
            <strong>${year}</strong>
            <span>${age} 岁</span>
          </div>
          <div class="event-group">
            ${eventItems}
          </div>
        </li>
      `;
    })
    .join("");

  el.emptyState.hidden = visibleEvents.length > 0;
}

function toggleSetValue(set, value) {
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
}

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.birthYear = clampBirthYear(el.birthYear.value);
  renderEvents();
});

el.birthYear.addEventListener("input", () => {
  state.birthYear = clampBirthYear(el.birthYear.value);
  renderEvents();
});

el.yearRange.addEventListener("input", () => {
  state.birthYear = clampBirthYear(el.yearRange.value);
  renderEvents();
});

el.categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  toggleSetValue(state.categories, button.dataset.category);
  renderEvents();
});

el.decadeFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-decade]");
  if (!button) return;
  toggleSetValue(state.decades, Number(button.dataset.decade));
  renderEvents();
});

el.phaseTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-phase]");
  if (!button) return;
  state.phase = button.dataset.phase;
  renderEvents();
});

el.resetFilters.addEventListener("click", () => {
  state.phase = "all";
  state.categories.clear();
  state.decades.clear();
  renderEvents();
});

renderEvents();
