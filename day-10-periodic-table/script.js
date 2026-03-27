'use strict';

/* === DOM References === */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const dom = {
  app: $('[data-app]'),
  table: $('[data-table]'),
  tableWrapper: $('[data-table-wrapper]'),
  controls: $('[data-controls]'),
};

/* === State === */
const state = {
  temperature: 293,
  searchQuery: '',
  activeCategory: 'all',
  modalElement: null,
};
