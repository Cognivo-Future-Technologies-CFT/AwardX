export const deriveStripeConnectStatus = (account) => {
    const chargesEnabled = !!account.charges_enabled;
    const payoutsEnabled = !!account.payouts_enabled;
    const detailsSubmitted = !!account.details_submitted;
    const onboardingCompleted = detailsSubmitted;
    const connected = chargesEnabled && payoutsEnabled && onboardingCompleted;
    return {
        connected,
        onboardingCompleted,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        disabledReason: account.requirements?.disabled_reason || null,
        requirementsDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
    };
};
