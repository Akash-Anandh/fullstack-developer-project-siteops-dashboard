import { INSTALLATION_STATUSES } from '../../constants';
import { formatStatusLabel } from '../../utils/formatStatusLabel';

export default function InstallationFormDialog({
  editingInstallation,
  installationForm,
  onInstallationFormChange,
  sites,
  formError,
  saving,
  onClose,
  onSubmit,
}) {
  function updateField(field, value) {
    onInstallationFormChange((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inst-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="inst-form-title">
          {editingInstallation ? 'Edit installation' : 'Add installation'}
        </h2>
        <p className="dialog-desc">
          {editingInstallation
            ? 'Update installation details.'
            : 'Link equipment to a site.'}
        </p>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-label">
              Site
              <select
                className="select"
                required
                value={installationForm.site_id}
                onChange={(event) => updateField('site_id', event.target.value)}
              >
                <option value="" disabled>
                  Select a site…
                </option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Equipment type
              <input
                className="field"
                required
                maxLength={100}
                value={installationForm.equipment_type}
                onChange={(event) =>
                  updateField('equipment_type', event.target.value)
                }
              />
            </label>
            <label className="form-label">
              Status
              <select
                className="select"
                value={installationForm.status}
                onChange={(event) => updateField('status', event.target.value)}
              >
                {INSTALLATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Notes
              <textarea
                className="textarea"
                maxLength={2000}
                value={installationForm.notes}
                onChange={(event) => updateField('notes', event.target.value)}
              />
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
                : editingInstallation
                  ? 'Save changes'
                  : 'Create installation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
