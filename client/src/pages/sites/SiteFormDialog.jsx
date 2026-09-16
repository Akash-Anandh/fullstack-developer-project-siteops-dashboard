import { SITE_STATUSES } from '../../constants';

export default function SiteFormDialog({
  editingSite,
  siteForm,
  onSiteFormChange,
  formError,
  saving,
  onClose,
  onSubmit,
}) {
  function updateField(field, value) {
    onSiteFormChange((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="site-form-title">{editingSite ? 'Edit site' : 'Add site'}</h2>
        <p className="dialog-desc">
          {editingSite ? 'Update site details.' : 'Create a new site record.'}
        </p>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-label">
              Name
              <input
                className="field"
                required
                maxLength={150}
                value={siteForm.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>
            <label className="form-label">
              Location
              <input
                className="field"
                maxLength={200}
                value={siteForm.location}
                onChange={(event) => updateField('location', event.target.value)}
              />
            </label>
            <label className="form-label">
              Status
              <select
                className="select"
                value={siteForm.status}
                onChange={(event) => updateField('status', event.target.value)}
              >
                {SITE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? 'Saving…'
                : editingSite
                  ? 'Save changes'
                  : 'Create site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
