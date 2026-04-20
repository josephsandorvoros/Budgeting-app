import { useEffect, useMemo, useState } from 'react';
import IconPicker from '../components/IconPicker.jsx';
import AppIcon from '../components/AppIcon.jsx';
import { loadAppSetting, saveAppSetting } from '../utils/appSettings.js';

const GROUPS = ['Income', 'Expenses', 'Savings', 'Debt'];
const LEFT_COL = ['Income', 'Savings'];
const RIGHT_COL = ['Expenses', 'Debt'];
const CATEGORY_ICON_GROUPS = {
  Money: ['💰','💵','💳','🏦','📈','📉','📊','💱','💸','🪙','💎','🧾','💼','📌'],
  Home: ['🏠','🏢','🏘️','🪑','🪟','🚿','🧹','🧺','🧴','🧽','💡','🔌','📶','🌐'],
  Transport: ['🚗','🚙','🚕','🚆','🚌','🚲','⛽','✈️','🧳','🏖️'],
  Food: ['🍽️','☕','🍔','🛒','📦'],
  Health: ['🏥','💊','🩺','🦷','🧠'],
  Life: ['🎯','🎮','🎬','🎵','📚','🎁','🎉','⚽','🏀','🏋️','🎨','📷'],
  FamilyPets: ['👶','🧒','🐶','🐱'],
  WorkTools: ['📝','📂','🗂️','📎','⚙️','🔧','🪛','🪜','🔖','🛠️','🛡️'],
  Nature: ['🌱','🌲','🌦️','🪴'],
  Other: ['🏷️','✅','📺','📱','💻','🖨️','🧯','🧪','🧬','🪪','🕹️','🏕️'],
};

const CATEGORY_EMOJIS = Array.from(new Set(Object.values(CATEGORY_ICON_GROUPS).flat()));

function makeGroupId() {
  return 'cg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function defaultGrouping(categories) {
  const result = {};
  GROUPS.forEach((g) => {
    result[g] = [{ id: makeGroupId(), name: g, categories: [...(categories[g] || [])] }];
  });
  return result;
}

function normalizeGrouping(raw, categories) {
  const map = raw && typeof raw === 'object' ? JSON.parse(JSON.stringify(raw)) : defaultGrouping(categories);

  GROUPS.forEach((group) => {
    const sourceCats = categories[group] || [];
    if (!Array.isArray(map[group]) || map[group].length === 0) {
      map[group] = [{ id: makeGroupId(), name: group, categories: [...sourceCats] }];
    }

    const seen = new Set();
    map[group].forEach((g) => {
      if (!g.id) g.id = makeGroupId();
      if (!g.name) g.name = 'Group';
      if (!Array.isArray(g.categories)) g.categories = [];
      g.categories = g.categories.filter((c) => sourceCats.includes(c) && !seen.has(c));
      g.categories.forEach((c) => seen.add(c));
    });

    sourceCats.forEach((c) => {
      if (!seen.has(c)) map[group][0].categories.push(c);
    });
  });
  return map;
}

export default function Categories({
  data,
  addCategory,
  removeCategory,
  renameCategory,
  budgetList,
  currentId,
  onSwitchBudget,
  onNavigateSettings,
}) {
  const { categories } = data;
  const storageKey = `cat_groups_v1_${currentId}`;
  const metaKey = `cat_meta_v1_${currentId}`;

  const [grouping, setGrouping] = useState(() => {
    return defaultGrouping(categories);
  });

  const [addingCat, setAddingCat] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', emoji: '🏷️', description: '', groupId: '' });
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupDraft, setGroupDraft] = useState('');
  const [catMeta, setCatMeta] = useState({});
  const [groupingLoaded, setGroupingLoaded] = useState(false);
  const [catMetaLoaded, setCatMetaLoaded] = useState(false);
  const currentBudget = budgetList.find(b => b.id === currentId);

  useEffect(() => {
    let cancelled = false;
    setGroupingLoaded(false);
    loadAppSetting(storageKey, null, storageKey).then((raw) => {
      if (!cancelled) {
        setGrouping(normalizeGrouping(raw, categories));
        setGroupingLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, categories]);

  useEffect(() => {
    if (!groupingLoaded) return;
    saveAppSetting(storageKey, grouping).catch(() => {
      /* ignore persistence errors */
    });
  }, [grouping, storageKey, groupingLoaded]);

  useEffect(() => {
    let cancelled = false;
    setCatMetaLoaded(false);
    loadAppSetting(metaKey, {}, metaKey).then((value) => {
      if (!cancelled) {
        setCatMeta(value || {});
        setCatMetaLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [metaKey]);

  useEffect(() => {
    if (!catMetaLoaded) return;
    saveAppSetting(metaKey, catMeta).catch(() => {
      /* ignore persistence errors */
    });
  }, [catMeta, metaKey, catMetaLoaded]);

  const catKey = (major, category) => `${major}::${category}`;
  const defaultEmoji = (major) => {
    if (major === 'Income') return '💸';
    if (major === 'Expenses') return '🧾';
    if (major === 'Savings') return '💰';
    return '📉';
  };

  const findGroupIdByCategory = (major, category) =>
    (grouping[major] || []).find(g => g.categories.includes(category))?.id || (grouping[major]?.[0]?.id || '');

  const updateGrouping = (fn) => {
    setGrouping(prev => normalizeGrouping(fn(JSON.parse(JSON.stringify(prev))), categories));
  };

  const moveCategoryToGroup = (major, category, targetGroupId) => {
    updateGrouping((next) => {
      (next[major] || []).forEach(g => { g.categories = g.categories.filter(c => c !== category); });
      const target = (next[major] || []).find(g => g.id === targetGroupId) || next[major]?.[0];
      if (target && !target.categories.includes(category)) target.categories.push(category);
      return next;
    });
  };

  const openAddCat = (major, groupId) => {
    setAddingCat({ major, groupId });
    setCatForm({
      name: '',
      emoji: defaultEmoji(major),
      description: '',
      groupId,
    });
  };

  const addGroup = (major) => {
    updateGrouping((next) => {
      next[major].push({ id: makeGroupId(), name: `${major} Group`, categories: [] });
      return next;
    });
  };

  const removeGroup = (major, groupId) => {
    updateGrouping((next) => {
      const list = next[major] || [];
      if (list.length <= 1) return next;
      const idx = list.findIndex(g => g.id === groupId);
      if (idx === -1) return next;
      const removed = list[idx];
      const target = idx === 0 ? list[1] : list[0];
      removed.categories.forEach((c) => {
        if (!target.categories.includes(c)) target.categories.push(c);
      });
      list.splice(idx, 1);
      return next;
    });
  };

  const openCatEdit = (major, category) => {
    setEditingCat({ major, category });
    const meta = catMeta[catKey(major, category)] || {};
    setCatForm({
      name: category,
      emoji: meta.emoji || defaultEmoji(major),
      description: meta.description || '',
      groupId: findGroupIdByCategory(major, category),
    });
  };

  const saveCatForm = () => {
    const nextName = catForm.name.trim();
    if (!nextName) return;

    if (editingCat) {
      const oldName = editingCat.category;
      const major = editingCat.major;

      if (nextName !== oldName) {
        renameCategory(major, oldName, nextName);
        updateGrouping((map) => {
          (map[major] || []).forEach(g => {
            g.categories = g.categories.map(c => c === oldName ? nextName : c);
          });
          return map;
        });
      }

      const finalName = nextName;
      const currentGroupId = findGroupIdByCategory(major, finalName);
      if (catForm.groupId && catForm.groupId !== currentGroupId) {
        moveCategoryToGroup(major, finalName, catForm.groupId);
      }

      setCatMeta(prev => {
        const next = { ...prev };
        const oldKey = catKey(major, oldName);
        const newKey = catKey(major, finalName);
        delete next[oldKey];
        next[newKey] = {
          emoji: catForm.emoji || defaultEmoji(major),
          description: catForm.description || '',
        };
        return next;
      });
    } else if (addingCat) {
      const major = addingCat.major;
      addCategory(major, nextName);
      updateGrouping((next) => {
        const grp = (next[major] || []).find(g => g.id === catForm.groupId) || (next[major] || [])[0];
        if (grp && !grp.categories.includes(nextName)) grp.categories.push(nextName);
        return next;
      });
      setCatMeta(prev => ({
        ...prev,
        [catKey(major, nextName)]: {
          emoji: catForm.emoji || defaultEmoji(major),
          description: catForm.description || '',
        },
      }));
    }

    setEditingCat(null);
    setAddingCat(null);
    setCatForm({ name: '', emoji: '🏷️', description: '', groupId: '' });
  };

  const openGroupEdit = (major, groupId, name) => {
    setEditingGroup({ major, groupId });
    setGroupDraft(name);
  };

  const saveGroupEdit = () => {
    if (!editingGroup) return;
    const nextName = groupDraft.trim();
    if (nextName) {
      updateGrouping((map) => {
        const g = (map[editingGroup.major] || []).find(v => v.id === editingGroup.groupId);
        if (g) g.name = nextName;
        return map;
      });
    }
    setEditingGroup(null);
    setGroupDraft('');
  };

  const renderMajor = (major) => (
    <section key={major} className="sca-major-section">
      <div className="sca-major-header">
        <span className={`sca-major-badge sca-major-${major.toLowerCase()}`}>{major.toUpperCase()}</span>
        <span className="sca-major-count">{(grouping[major] || []).length} groups</span>
      </div>

      {(grouping[major] || []).map((grp) => (
        <div key={grp.id} className="sca-group-card">
          <div className="sca-group-head">
            <div className="sca-group-title-wrap">
              <span className="sca-grip">⋮⋮</span>
              <span className="sca-group-title">{grp.name}</span>
            </div>
            <div className="sca-row-actions">
              <button className="sca-icon-btn" onClick={() => openGroupEdit(major, grp.id, grp.name)} title="Edit group">✎</button>
              <button className="sca-icon-btn" onClick={() => removeGroup(major, grp.id)} title="Delete group">🗑</button>
            </div>
          </div>

          <div className="sca-group-body">
            {grp.categories.map((cat) => (
              <div key={cat} className="sca-item-row">
                <div className="sca-item-main">
                  <span className="sca-grip">⋮⋮</span>
                  <AppIcon
                    value={catMeta[catKey(major, cat)]?.emoji || defaultEmoji(major)}
                    fallback={defaultEmoji(major)}
                    className="sca-item-icon"
                    label="category icon"
                  />
                  <div>
                    <div>{cat}</div>
                    <div className="sca-subtext">{catMeta[catKey(major, cat)]?.description || ''}</div>
                  </div>
                </div>
                <div className="sca-row-actions">
                  <button className="sca-icon-btn" onClick={() => openCatEdit(major, cat)} title="Edit category">✎</button>
                  <button className="sca-icon-btn" onClick={() => removeCategory(major, cat)} title="Delete category">🗑</button>
                </div>
              </div>
            ))}

            <button className="sca-inline-add" onClick={() => openAddCat(major, grp.id)}>+ Add Category</button>
          </div>

          <div className="sca-group-footer">
            <span>{grp.categories.length} categories</span>
          </div>
        </div>
      ))}

      <button className="sca-add-group-btn" onClick={() => addGroup(major)}>+ Add Category Group</button>
    </section>
  );

  return (
    <div className="page sca-page">
      <div className="sca-topbar">
        <div>
          <div className="sca-title">Categories &amp; Accounts</div>
          <div className="subtitle">{Object.values(categories || {}).flat().length} categories</div>
        </div>

        <div className="sca-top-controls">
          <select value={currentId} onChange={(e) => onSwitchBudget(e.target.value)} className="sca-budget-select">
            {budgetList.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.year})</option>
            ))}
          </select>

          <div className="sca-tabs">
            <button className="sca-tab sca-tab-active" onClick={() => onNavigateSettings('categories')}>Categories</button>
            <button className="sca-tab" onClick={() => onNavigateSettings('accounts')}>Accounts</button>
          </div>
        </div>
      </div>

      <div className="sca-cols">
        <div className="sca-col">
          {LEFT_COL.map(renderMajor)}
        </div>
        <div className="sca-col">
          {RIGHT_COL.map(renderMajor)}
        </div>
      </div>

      {(editingCat || addingCat) && (
        <div className="modal-backdrop" onClick={() => { setEditingCat(null); setAddingCat(null); }}>
          <div className="modal sca-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCat ? 'Edit Category' : 'Add Category'}</h2>
              <button className="modal-close" onClick={() => { setEditingCat(null); setAddingCat(null); }}>✕</button>
            </div>
            <div className="modal-body sca-modal-grid">
              <label>
                Emoji
                <IconPicker
                  value={catForm.emoji}
                  onChange={(emoji) => setCatForm(f => ({ ...f, emoji }))}
                  options={CATEGORY_EMOJIS}
                  groups={CATEGORY_ICON_GROUPS}
                  storageKey={`category_icon_picker_${currentId}`}
                />
              </label>
              <label>
                Name *
                <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} autoFocus placeholder="Category name" />
              </label>
              <label className="full-width">
                Description
                <textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optional notes about this category..." />
              </label>
              <label className="full-width">
                Group
                <select value={catForm.groupId} onChange={e => setCatForm(f => ({ ...f, groupId: e.target.value }))}>
                  {(grouping[(editingCat?.major || addingCat?.major)] || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => { setEditingCat(null); setAddingCat(null); }}>Cancel</button>
              <button className="btn-primary" onClick={saveCatForm}>{editingCat ? 'Save Changes' : 'Add Category'}</button>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <div className="modal-backdrop" onClick={() => setEditingGroup(null)}>
          <div className="modal sca-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Category Group</h2>
              <button className="modal-close" onClick={() => setEditingGroup(null)}>✕</button>
            </div>
            <div className="modal-body">
              <label>
                Group Name
                <input value={groupDraft} onChange={e => setGroupDraft(e.target.value)} autoFocus />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setEditingGroup(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveGroupEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="sca-footer-note">
        Editing {currentBudget?.name || 'budget'}
      </div>
    </div>
  );
}
