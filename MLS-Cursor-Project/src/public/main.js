document.addEventListener('DOMContentLoaded', function() {
    const dateRangeSelect = document.getElementById('dateRange');
    const limitSelect = document.getElementById('limit');
    const customDateRange = document.querySelector('.custom-date-range');

    // Handle date range changes
    dateRangeSelect?.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
            submitForm();
        }
    });

    // Handle results per page changes
    limitSelect?.addEventListener('change', submitForm);

    function submitForm() {
        // Preserve all current query parameters
        const currentUrl = new URL(window.location.href);
        const searchParams = currentUrl.searchParams;

        // Update or add new parameters
        searchParams.set('dateRange', dateRangeSelect.value);
        searchParams.set('limit', limitSelect.value);
        searchParams.set('page', '1'); // Reset to first page on filter change

        // Redirect with updated parameters
        window.location.href = currentUrl.toString();
    }
}); 