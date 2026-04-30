/**
 * Каскадный фильтр для Assignment-формы (UserAdmin inline + AssignmentAdmin).
 *
 * Каждый <option> Department имеет атрибут data-company-id (рендерится
 * CompanyAwareDepartmentSelect). Скрипт подвязывает change-обработчик на
 * select[name$="-company"] / select[name="company"] и скрывает варианты
 * Department, чьё data-company-id не совпадает с выбранной компанией.
 *
 * Работает и для существующих строк, и для динамически добавленных
 * («Добавить ещё одно Назначение») через formset:added jQuery-событие
 * Django-админки.
 */
(function () {
  "use strict";

  function applyFilter(deptSelect, companyId) {
    const want = companyId ? String(companyId) : "";
    let current = deptSelect.value;
    let currentBecameHidden = false;

    Array.from(deptSelect.options).forEach((opt) => {
      if (!opt.value) {
        // Пустой/blank-вариант оставляем видимым — позволяет «не выбрано».
        opt.hidden = false;
        opt.disabled = false;
        return;
      }
      const cid = opt.dataset.companyId || "";
      const matches = !want || cid === want;
      opt.hidden = !matches;
      opt.disabled = !matches;
      if (!matches && opt.value === current) {
        currentBecameHidden = true;
      }
    });

    if (currentBecameHidden) {
      deptSelect.value = "";
    }
  }

  function findPair(scope) {
    // Внутри inline-строки company/department — соседние select'ы.
    // На AssignmentAdmin (single-form) — top-level select'ы.
    const company = scope.querySelector('select[name$="company"], select[name="company"]');
    const department = scope.querySelector('select[name$="department"], select[name="department"]');
    return { company, department };
  }

  function bind(scope) {
    const { company, department } = findPair(scope);
    if (!company || !department) return;
    if (department.dataset.cascadeBound === "1") return;
    department.dataset.cascadeBound = "1";

    applyFilter(department, company.value);
    company.addEventListener("change", () => applyFilter(department, company.value));
  }

  function bindAll() {
    // Inline-строки (TabularInline) и обычная форма (AssignmentAdmin).
    const rows = document.querySelectorAll(
      ".inline-related, .form-row, .module > form"
    );
    if (rows.length === 0) {
      bind(document);
      return;
    }
    rows.forEach(bind);
    // Также пробуем зацепить весь документ — на случай нестандартных layout'ов.
    bind(document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAll);
  } else {
    bindAll();
  }

  // Динамически добавленные строки через "Добавить ещё одно".
  if (typeof django !== "undefined" && django.jQuery) {
    django.jQuery(document).on("formset:added", function (event, $row) {
      const node = $row && $row[0] ? $row[0] : event.target;
      if (node) bind(node);
    });
  }
})();
