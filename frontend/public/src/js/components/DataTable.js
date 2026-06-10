/**
 * DataTable — sortable, filterable, paginated table component.
 *
 * Usage:
 *   const dt = new DataTable({
 *     container: document.getElementById('my-table'),
 *     columns: [
 *       { key: 'nombre', label: 'Nombre', sortable: true },
 *       { key: 'cantidad', label: 'Cantidad', sortable: true, align: 'right' },
 *       { key: 'estado', label: 'Estado', render: (val, row) => `<span class="badge badge-${val}">${val}</span>` },
 *       { key: '_actions', label: '', render: (_, row) => `<button class="btn btn-sm" data-id="${row.id}">Ver</button>` },
 *     ],
 *     pageSize: 20,          // default 20
 *     searchable: true,      // show search input, default true
 *     emptyText: 'Sin datos',
 *   });
 *   dt.setData(rows);         // replace all data
 *   dt.refresh();             // re-render with current data
 *   dt.on('rowClick', (row) => ...);    // click on TR
 *   dt.on('actionClick', (id, row) => ...);  // click on [data-id] element
 */

export class DataTable extends EventTarget {
  constructor({ container, columns = [], pageSize = 20, searchable = true, emptyText = 'Sin datos' }) {
    super();
    this._container = container;
    this._columns   = columns;
    this._pageSize  = pageSize;
    this._searchable = searchable;
    this._emptyText = emptyText;
    this._data      = [];       // original data
    this._filtered  = [];       // filtered data
    this._sortKey   = null;
    this._sortDir   = 'asc';    // 'asc' | 'desc'
    this._page      = 1;
    this._query     = '';
    this._render();
  }

  // --- Public API ---

  setData(rows) {
    this._data = Array.isArray(rows) ? rows : [];
    this._page = 1;
    this._applyFilter();
  }

  refresh() {
    this._applyFilter();
  }

  on(event, handler) {
    this.addEventListener(event, (e) => handler(e.detail));
  }

  // --- Internal ---

  _applyFilter() {
    const q = this._query.toLowerCase().trim();
    if (!q) {
      this._filtered = [...this._data];
    } else {
      this._filtered = this._data.filter(row =>
        this._columns.some(col => {
          if (col.key.startsWith('_')) return false;
          const val = row[col.key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    this._applySort();
  }

  _applySort() {
    if (this._sortKey) {
      const dir = this._sortDir === 'asc' ? 1 : -1;
      this._filtered.sort((a, b) => {
        const av = a[this._sortKey] ?? '';
        const bv = b[this._sortKey] ?? '';
        if (av < bv) return -1 * dir;
        if (av > bv) return  1 * dir;
        return 0;
      });
    }
    this._renderTable();
  }

  _renderTable() {
    const totalPages = Math.max(1, Math.ceil(this._filtered.length / this._pageSize));
    if (this._page > totalPages) this._page = totalPages;

    const start = (this._page - 1) * this._pageSize;
    const indexedRows = this._filtered.slice(start, start + this._pageSize);

    // Header
    const thead = this._el.querySelector('thead tr');
    thead.innerHTML = this._columns.map(col => {
      const sortable = col.sortable ? ' class="sortable"' : '';
      const align    = col.align === 'right' ? ' style="text-align:right"' : '';
      const arrow    = this._sortKey === col.key
        ? (this._sortDir === 'asc' ? ' ↑' : ' ↓') : '';
      const ariaSort = col.sortable
        ? ` aria-sort="${this._sortKey === col.key ? (this._sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}"`
        : '';
      return `<th${sortable}${align} data-key="${col.key}"${ariaSort}>${col.label}${arrow}</th>`;
    }).join('');

    // Body
    const tbody = this._el.querySelector('tbody');
    if (indexedRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${this._columns.length}" style="text-align:center;padding:32px;color:var(--text-secondary)">${this._emptyText}</td></tr>`;
    } else {
      tbody.innerHTML = indexedRows.map((row) => {
        const dataIdx = this._data.indexOf(row);
        return `<tr data-id="${row.id ?? ''}" data-row-idx="${dataIdx}">${this._columns.map(col => {
          const val = row[col.key];
          const cell = col.render ? col.render(val, row) : (val ?? '—');
          const align = col.align === 'right' ? ' style="text-align:right"' : '';
          return `<td${align}>${cell}</td>`;
        }).join('')}</tr>`;
      }).join('');
    }

    // Pagination
    this._renderPager(totalPages);

    // Re-wire sort clicks
    thead.querySelectorAll('th.sortable').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (this._sortKey === key) {
          this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._sortKey = key;
          this._sortDir = 'asc';
        }
        this._applySort();
      });
    });

  }

  _renderPager(totalPages) {
    const pager = this._el.querySelector('.dt-pager');
    const info  = this._el.querySelector('.dt-info');
    const total = this._filtered.length;
    const start = (this._page - 1) * this._pageSize + 1;
    const end   = Math.min(this._page * this._pageSize, total);
    info.textContent = total === 0 ? '' : `${start}–${end} de ${total}`;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(`<button class="btn btn-sm${i === this._page ? ' btn-primary' : ' btn-secondary'}" data-page="${i}">${i}</button>`);
    }
    pager.innerHTML = `
      <button class="btn btn-sm btn-secondary" data-page="${this._page - 1}" ${this._page <= 1 ? 'disabled' : ''}>‹</button>
      ${totalPages <= 7 ? pages.join('') : `<span class="text-secondary">Pág ${this._page} / ${totalPages}</span>`}
      <button class="btn btn-sm btn-secondary" data-page="${this._page + 1}" ${this._page >= totalPages ? 'disabled' : ''}>›</button>
    `;
    pager.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (p >= 1 && p <= totalPages && p !== this._page) {
          this._page = p;
          this._renderTable();
        }
      });
    });
  }

  _render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'dt-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '12px';

    if (this._searchable) {
      const searchBar = document.createElement('div');
      searchBar.className = 'dt-search';
      searchBar.innerHTML = `<input type="search" class="form-control" placeholder="Buscar…" style="max-width:320px" aria-label="Buscar en tabla">`;
      searchBar.querySelector('input').addEventListener('input', (e) => {
        this._query = e.target.value;
        this._page  = 1;
        this._applyFilter();
      });
      wrapper.appendChild(searchBar);
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.style.overflowX = 'auto';
    tableWrapper.innerHTML = `
      <table class="table">
        <thead><tr></tr></thead>
        <tbody></tbody>
      </table>
    `;
    wrapper.appendChild(tableWrapper);

    // Wire tbody click once (delegation — avoids accumulation on every _renderTable call)
    const tbody = tableWrapper.querySelector('tbody');
    tbody.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-id]');
      const tr = e.target.closest('tr[data-row-idx]');
      const rowIdx = parseInt(actionEl?.closest('tr')?.dataset.rowIdx ?? tr?.dataset.rowIdx ?? '-1');
      const row = rowIdx >= 0 ? this._data[rowIdx] : undefined;
      const id = (actionEl || tr)?.dataset.id || rowIdx;
      if (actionEl && actionEl !== tr) {
        this.dispatchEvent(new CustomEvent('actionClick', { detail: { id, row } }));
      } else if (tr) {
        this.dispatchEvent(new CustomEvent('rowClick', { detail: row }));
      }
    });

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';
    footer.innerHTML = `<span class="dt-info text-secondary" style="font-size:var(--text-sm)"></span><div class="dt-pager" style="display:flex;gap:4px;flex-wrap:wrap"></div>`;
    wrapper.appendChild(footer);

    this._el = wrapper;
    this._container.innerHTML = '';
    this._container.appendChild(wrapper);
    this._renderTable();
  }
}

export default DataTable;
