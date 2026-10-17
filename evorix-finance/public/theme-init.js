/* Runs before styles and prerendered markup. Keep external: CSP permits self scripts. */
(function () {
  var storageKey = "ediv-appearance-v1";
  var preference = "dark";
  var listeners = new Set();
  function valid(value) {
    return value === "light" || value === "dark";
  }
  try {
    var saved = window.localStorage.getItem(storageKey);
    if (valid(saved)) preference = saved;
  } catch (_) {
    /* Storage can be disabled; the in-memory choice still works. */
  }
  var snapshot;
  function apply() {
    var theme = preference;
    if (
      snapshot &&
      snapshot.theme === theme &&
      snapshot.preference === preference
    )
      return;
    snapshot = Object.freeze({ theme: theme, preference: preference });
    document.documentElement.dataset.theme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute("content", theme === "dark" ? "#1c2025" : "#f7f8f6");
    listeners.forEach(function (listener) {
      listener();
    });
  }
  window.edivTheme = {
    getSnapshot: function () {
      return snapshot;
    },
    subscribe: function (listener) {
      listeners.add(listener);
      return function () {
        listeners.delete(listener);
      };
    },
    setPreference: function (value) {
      if (!valid(value)) return;
      preference = value;
      try {
        window.localStorage.setItem(storageKey, value);
      } catch (_) {
        /* Retain the choice for this page when persistence fails. */
      }
      apply();
    },
  };
  apply();
  window.addEventListener("storage", function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== window.localStorage)
        return;
    } catch (_) {
      return;
    }
    preference = valid(event.newValue) ? event.newValue : "dark";
    apply();
  });
})();
