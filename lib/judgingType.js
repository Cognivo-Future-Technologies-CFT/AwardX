export const DEFAULT_JUDGING_TYPE = 'parallel';
export const JUDGING_TYPE_OPTIONS = [
    {
        value: 'parallel',
        label: 'Parallel Judging',
        description: 'Every judge can evaluate every submission. Final score is the average of all judges.',
    },
    {
        value: 'auto_assign',
        label: 'Auto Assign Judging',
        description: 'Judges are assigned by category. Each judge only sees submissions in their categories.',
    },
];
export function normalizeJudgingType(value) {
    return value === 'auto_assign' ? 'auto_assign' : 'parallel';
}
export function isAutoAssignJudging(value) {
    return normalizeJudgingType(value) === 'auto_assign';
}
export function getCategorySelectorLabels(isAutoAssign) {
    return {
        fieldTypeLabel: isAutoAssign ? 'Category Selector' : 'Award Selector',
        fieldDescription: isAutoAssign ? 'Pick submission category' : 'Pick award category',
        defaultLabel: isAutoAssign ? 'Category Selection' : 'Award Selection',
        defaultPlaceholder: isAutoAssign ? 'Select category...' : 'Select award category...',
        missingFieldTitle: isAutoAssign ? 'Category Selector required' : 'No award selector',
        missingFieldMessage: isAutoAssign
            ? 'Auto Assign Judging requires a Category Selector on the submission form before you can publish.'
            : "This form does not include an Award Selector field. Submissions may be harder to route to the right category unless you assign awards manually later.",
    };
}
