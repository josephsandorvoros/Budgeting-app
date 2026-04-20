import { useEffect, useMemo, useState } from 'react';
import { ACCOUNT_HIERARCHY } from '../data/defaults.js';
import IconPicker from '../components/IconPicker.jsx';
import AppIcon from '../components/AppIcon.jsx';
import { loadAppSetting, saveAppSetting } from '../utils/appSettings.js';

const blank = {
  name: '',
  assetClass: 'ASSETS',
  subtype: ACCOUNT_HIERARCHY.ASSETS[0],
  startBalance: 0,
  icon: '🏦',
  description: '',
  institution: '',
  last4: '',
  tracked: true,
};

const INSTITUTIONS = ['','Bank of America','Chase','Wells Fargo','USAA','Fidelity','Vanguard','Amex','Capital One','Credit Union'];
const ACCOUNT_ICON_GROUPS = {
  Finance: ['🏦','💳','💰','💵','🪙','📈','📉','📊','💱','₿','💎','🧾','📋','🧮'],
  Property: ['🏠','🏢','🏘️','🏭','🧱','🔐','🗝️','🔒'],
  Vehicles: ['🚗','🚙','🚚','⛽','🔧','🛠️','🛡️','🚆','🚌','🚲','✈️'],
  HealthLife: ['🏥','💊','🩺','🧠','🌱','🔥','⚡','🌦️'],
  WorkTech: ['💼','📦','🗂️','📁','📌','🌐','📱','💻','🖥️','🖨️','📡','📶','🔌','💡'],
  Family: ['👶','🧒','🍼','👛','👜','🐶','🐱','🎁'],
  Leisure: ['🏖️','🧳','🏕️','🎯','🎮','🎬','🎵','📚','🏆','🥇','🏅'],
  Misc: ['📎','🧷','🧰','🪛','🪜','🧯','🚿','🍽️','☕','🍔','🛒','🪴','🌍','🪪'],
};

const ACCOUNT_EMOJIS = Array.from(new Set(Object.values(ACCOUNT_ICON_GROUPS).flat()));

function groupKey(className) {
  return className === 'ASSETS' ? 'assets' : 'liabilities';
}

function makeSubtypeList(accounts, stored) {
  const defaults = {
    ASSETS: [...ACCOUNT_HIERARCHY.ASSETS],
    LIABILITIES: [...ACCOUNT_HIERARCHY.LIABILITIES],
  };
  const parsed = stored && typeof stored === 'object' ? stored : defaults;
  return {
    ASSETS: Array.from(new Set([...(parsed.ASSETS || []), ...defaults.ASSETS, ...accounts.filter(a => a.assetClass === 'ASSETS').map(a => a.subtype).filter(Boolean)])),
    LIABILITIES: Array.from(new Set([...(parsed.LIABILITIES || []), ...defaults.LIABILITIES, ...accounts.filter(a => a.assetClass === 'LIABILITIES').map(a => a.subtype).filter(Boolean)])),
  };
}

export default function SettingsAccounts({
  data,
  addAccount,
  updateAccount,
  deleteAccount,
  budgetList,
  currentId,
  onSwitchBudget,
  onNavigateSettings,
}) {
  const accounts = data.accounts || [];
  const groupsKey = `account_groups_v1_${currentId}`;
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [subtypes, setSubtypes] = useState(() => makeSubtypeList(accounts, null));
  const [newGroupName, setNewGroupName] = useState({ ASSETS: '', LIABILITIES: '' });
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupDraft, setGroupDraft] = useState('');
  const [modalAssetClass, setModalAssetClass] = useState('ASSETS');
  const [customInstitution, setCustomInstitution] = useState('');
  const [useCustomInstitution, setUseCustomInstitution] = useState(false);
  const [institutionOptions, setInstitutionOptions] = useState([...INSTITUTIONS]);
  const [subtypesLoaded, setSubtypesLoaded] = useState(false);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [institutionsLoaded, setInstitutionsLoaded] = useState(false);

  const metaKey = `account_meta_v1_${currentId}`;
  const [accountMeta, setAccountMeta] = useState({});

  useEffect(() => {
    let cancelled = false;
    setSubtypesLoaded(false);
    loadAppSetting(groupsKey, null, groupsKey).then((stored) => {
      if (!cancelled) {
        setSubtypes(makeSubtypeList(accounts, stored));
        setSubtypesLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accounts, groupsKey]);

  useEffect(() => {
    let cancelled = false;
    setMetaLoaded(false);
    loadAppSetting(metaKey, {}, metaKey).then((stored) => {
      if (!cancelled) {
        setAccountMeta(stored || {});
        setMetaLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [metaKey]);

  useEffect(() => {
    let cancelled = false;
    setInstitutionsLoaded(false);
    loadAppSetting('institution_options_v1', [], 'institution_options_v1').then((stored) => {
      if (!cancelled) {
        setInstitutionOptions(Array.from(new Set([...INSTITUTIONS, ...(stored || [])])));
        setInstitutionsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!subtypesLoaded) return;
    saveAppSetting(groupsKey, subtypes).catch(() => {
      /* ignore persistence errors */
    });
  }, [subtypes, groupsKey, subtypesLoaded]);

  useEffect(() => {
    if (!metaLoaded) return;
    saveAppSetting(metaKey, accountMeta).catch(() => {
      /* ignore persistence errors */
    });
  }, [accountMeta, metaKey, metaLoaded]);

  useEffect(() => {
    if (!institutionsLoaded) return;
    saveAppSetting('institution_options_v1', institutionOptions.filter(Boolean)).catch(() => {
      /* ignore persistence errors */
    });
  }, [institutionOptions, institutionsLoaded]);

  const grouped = useMemo(() => {
    const map = { ASSETS: {}, LIABILITIES: {} };
    (['ASSETS', 'LIABILITIES']).forEach((cls) => {
      (subtypes[cls] || []).forEach(st => {
        map[cls][st] = accounts.filter(a => a.assetClass === cls && a.subtype === st);
      });
    });
    return map;
  }, [accounts, subtypes]);

  const beginEdit = (acc) => {
    setEditingId(acc.id);
    const meta = accountMeta[acc.id] || {};
    setForm({
      name: acc.name || '',
      assetClass: acc.assetClass || 'ASSETS',
      subtype: acc.subtype || ACCOUNT_HIERARCHY.ASSETS[0],
      startBalance: acc.startBalance || 0,
      icon: acc.icon || '🏦',
      description: meta.description || '',
      institution: meta.institution || '',
      last4: meta.last4 || '',
      tracked: meta.tracked !== false,
    });
    setModalAssetClass(acc.assetClass || 'ASSETS');
    setUseCustomInstitution(!!meta.institution && !institutionOptions.includes(meta.institution));
    setCustomInstitution(meta.institution || '');
    setOpenModal(true);
  };

  const reset = () => {
    setEditingId(null);
    setForm(blank);
    setModalAssetClass('ASSETS');
    setCustomInstitution('');
    setUseCustomInstitution(false);
    setOpenModal(false);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      assetClass: modalAssetClass,
      subtype: form.subtype,
      startBalance: form.startBalance,
      icon: form.icon || '🏦',
    };

    if (editingId) {
      updateAccount(editingId, payload);
      setAccountMeta(prev => ({
        ...prev,
        [editingId]: {
          description: form.description || '',
          institution: form.institution || '',
          last4: form.last4 || '',
          tracked: !!form.tracked,
        },
      }));
    } else {
      addAccount(payload);
    }

    const inst = (form.institution || customInstitution || '').trim();
    if (inst && !institutionOptions.includes(inst)) {
      const next = [...institutionOptions, inst];
      setInstitutionOptions(next);
    }
    reset();
  };

  const openCreateForGroup = (assetClass, subtype) => {
    setEditingId(null);
    setModalAssetClass(assetClass);
    setForm({ ...blank, assetClass, subtype, icon: assetClass === 'ASSETS' ? '🏦' : '💳' });
    setUseCustomInstitution(false);
    setCustomInstitution('');
    setOpenModal(true);
  };

  const addGroup = (cls) => {
    const name = (newGroupName[cls] || '').trim();
    if (!name) return;
    setSubtypes(prev => ({
      ...prev,
      [cls]: prev[cls].includes(name) ? prev[cls] : [...prev[cls], name],
    }));
    setNewGroupName(prev => ({ ...prev, [cls]: '' }));
  };

  const openGroupEdit = (cls, oldName) => {
    setEditingGroup({ cls, oldName });
    setGroupDraft(oldName);
  };

  const saveGroupEdit = () => {
    if (!editingGroup) return;
    const next = groupDraft.trim();
    if (!next || next === editingGroup.oldName) {
      setEditingGroup(null);
      setGroupDraft('');
      return;
    }

    setSubtypes(prev => ({
      ...prev,
      [editingGroup.cls]: prev[editingGroup.cls].map(s => s === editingGroup.oldName ? next : s),
    }));
    accounts.filter(a => a.assetClass === editingGroup.cls && a.subtype === editingGroup.oldName)
      .forEach(a => updateAccount(a.id, { subtype: next }));

    setEditingGroup(null);
    setGroupDraft('');
  };

  const deleteGroup = (cls, subtype) => {
    const fallback = cls === 'ASSETS' ? ACCOUNT_HIERARCHY.ASSETS[0] : ACCOUNT_HIERARCHY.LIABILITIES[0];
    if (subtype === fallback) return;

    accounts.filter(a => a.assetClass === cls && a.subtype === subtype)
      .forEach(a => updateAccount(a.id, { subtype: fallback }));

    setSubtypes(prev => ({
      ...prev,
      [cls]: prev[cls].filter(s => s !== subtype),
    }));
  };

  const renderClassSection = (cls) => (
    <section key={cls} className="sca-major-section">
      <div className="sca-major-header">
        <span className={`sca-major-badge sca-major-${groupKey(cls)}`}>{cls === 'ASSETS' ? 'ASSETS' : 'LIABILITIES'}</span>
        <span className="sca-major-count">{(subtypes[cls] || []).length} groups</span>
      </div>

      {(subtypes[cls] || []).map((st) => (
        <div key={`${cls}-${st}`} className="sca-group-card">
          <div className="sca-group-head">
            <div className="sca-group-title-wrap">
              <span className="sca-grip">⋮⋮</span>
              <span className="sca-group-title">{st}</span>
            </div>
            <div className="sca-row-actions">
              <button className="sca-icon-btn" onClick={() => openGroupEdit(cls, st)} title="Edit group">✎</button>
              <button className="sca-icon-btn" onClick={() => deleteGroup(cls, st)} title="Delete group">🗑</button>
            </div>
          </div>

          <div className="sca-group-body">
            {(grouped[cls][st] || []).map((acc) => {
              const meta = accountMeta[acc.id] || {};
              return (
                <div key={acc.id} className="sca-item-row">
                  <div className="sca-item-main">
                    <span className="sca-grip">⋮⋮</span>
                    <AppIcon value={acc.icon || '🏦'} fallback="🏦" className="sca-item-icon" label="account icon" />
                    <div>
                      <div>{acc.name}</div>
                      <div className="sca-subtext">{meta.description || `Starting balance ${Number(acc.startBalance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}</div>
                    </div>
                  </div>
                  <div className="sca-row-actions">
                    {(meta.tracked !== false) && <span className="sca-track-pill">TRACKED</span>}
                    <button className="sca-icon-btn" onClick={() => beginEdit(acc)} title="Edit account">✎</button>
                    <button className="sca-icon-btn" onClick={() => deleteAccount(acc.id)} title="Delete account">🗑</button>
                  </div>
                </div>
              );
            })}

            <button className="sca-inline-add" onClick={() => openCreateForGroup(cls, st)}>+ Add Account</button>
          </div>

          <div className="sca-group-footer"><span>{(grouped[cls][st] || []).length} accounts</span></div>
        </div>
      ))}

      <div className="sca-add-row sca-add-group-row">
        <input
          type="text"
          value={newGroupName[cls] || ''}
          onChange={e => setNewGroupName(p => ({ ...p, [cls]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addGroup(cls)}
          placeholder="+ Add Account Group"
        />
        <button className="btn-ghost" onClick={() => addGroup(cls)}>Add Group</button>
      </div>
    </section>
  );

  return (
    <div className="page sca-page">
      <div className="sca-topbar">
        <div>
          <div className="sca-title">Categories &amp; Accounts</div>
          <div className="subtitle">{accounts.length} accounts</div>
        </div>

        <div className="sca-top-controls">
          <select value={currentId} onChange={(e) => onSwitchBudget(e.target.value)} className="sca-budget-select">
            {budgetList.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.year})</option>
            ))}
          </select>

          <div className="sca-tabs">
            <button className="sca-tab" onClick={() => onNavigateSettings('categories')}>Categories</button>
            <button className="sca-tab sca-tab-active" onClick={() => onNavigateSettings('accounts')}>Accounts</button>
          </div>
        </div>
      </div>

      <div className="sca-cols">
        <div className="sca-col">{renderClassSection('ASSETS')}</div>
        <div className="sca-col">{renderClassSection('LIABILITIES')}</div>
      </div>

      {openModal && (
        <div className="modal-backdrop" onClick={reset}>
          <div className="modal sca-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Account' : 'Add Account'}</h2>
              <button className="modal-close" onClick={reset}>✕</button>
            </div>
            <div className="modal-body sca-modal-grid">
              <label>
                Emoji
                <IconPicker
                  value={form.icon}
                  onChange={(icon) => setForm(v => ({ ...v, icon }))}
                  options={ACCOUNT_EMOJIS}
                  groups={ACCOUNT_ICON_GROUPS}
                  storageKey={`account_icon_picker_${currentId}`}
                />
              </label>
              <label>
                Name *
                <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} autoFocus />
              </label>
              <label className="full-width">
                Description
                <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={3} />
              </label>
              <label>
                Institution
                <select
                  value={institutionOptions.includes(form.institution) ? form.institution : '__custom__'}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '__custom__') {
                      setUseCustomInstitution(true);
                      setCustomInstitution(form.institution || '');
                      setForm(f => ({ ...f, institution: '' }));
                    } else {
                      setUseCustomInstitution(false);
                      setForm(f => ({ ...f, institution: v }));
                    }
                  }}
                >
                  {institutionOptions.map(i => <option key={i || 'none'} value={i}>{i || 'Select institution...'}</option>)}
                  <option value="__custom__">Custom institution...</option>
                </select>
              </label>
              <label>
                Last 4
                <input value={form.last4} onChange={e => setForm(v => ({ ...v, last4: e.target.value }))} maxLength={4} />
              </label>
              {useCustomInstitution && (
                <label className="full-width">
                  Custom Institution
                  <input
                    value={customInstitution}
                    onChange={e => {
                      const v = e.target.value;
                      setCustomInstitution(v);
                      setForm(f => ({ ...f, institution: v }));
                    }}
                    placeholder="Enter institution name"
                  />
                </label>
              )}
              <label className="full-width">
                Group
                <select value={form.subtype} onChange={e => setForm(v => ({ ...v, subtype: e.target.value }))}>
                  {(subtypes[modalAssetClass] || ACCOUNT_HIERARCHY[modalAssetClass]).map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </label>
              <label className="full-width">
                Starting Balance
                <input type="number" value={form.startBalance} onChange={e => setForm(v => ({ ...v, startBalance: parseFloat(e.target.value) || 0 }))} />
              </label>
              <label className="checkbox-label full-width" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={!!form.tracked} onChange={e => setForm(v => ({ ...v, tracked: e.target.checked }))} />
                Track balance from transactions
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={reset}>Cancel</button>
              <button className="btn-primary" onClick={submit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <div className="modal-backdrop" onClick={() => setEditingGroup(null)}>
          <div className="modal sca-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Account Group</h2>
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
    </div>
  );
}
