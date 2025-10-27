/**
 * @purpose Render status pill for approval flow using consistent styling.
 * @inputs status string in {kladde, afventer, godkendt, afvist}.
 * @outputs Styled span element representing current approval state.
 */

const LABELS = {
  kladde: 'Kladde',
  afventer: 'Afventer',
  godkendt: 'Godkendt',
  afvist: 'Afvist'
};

export default function ApprovalBadge({ status }) {
  const key = status ?? 'kladde';
  return (
    <span className="approval-badge" data-status={key}>
      {LABELS[key] ?? LABELS.kladde}
    </span>
  );
}
