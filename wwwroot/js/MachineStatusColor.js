$(function () {
    initializeColorPickers();
});

function initializeColorPickers() {
    $('.colorPicker').each(function () {
        const $picker = $(this);
        const originalHex = $picker.val().toLowerCase();
        const $row = $picker.closest('tr');
        const $hexDisplay = $row.find('.hex_value');
        const $colorName = $row.find('.status_color');
        const $updateBtn = $row.find('.update-btn');

        // Set initial color name
        const match = ntc.name(originalHex);
        $colorName.text(match[1]);

        $picker.on('input', function () {
            const currentHex = $picker.val().toLowerCase();
            const match = ntc.name(currentHex);

            $hexDisplay.text(currentHex);
            $colorName.text(match[1]);

            if (currentHex !== originalHex) {
                $updateBtn.removeClass('d-none');
            } else {
                $updateBtn.addClass('d-none');
            }
        });
    });
}

function updateColor(hex, $row) {
    const match = ntc.name(hex);  // get color name using ntc.js library
    const $colorName = $row.find('.status_color');
    const $hexDisplay = $row.find('.hex_value');

    $colorName.text(match[1]);
    $hexDisplay.text(hex);
}

function Update(btn) {
    const $row = $(btn).closest('tr');

    const status_id = $row.find('.status_id').text();
    const status_color = $row.find('.status_color').text();
    const hex_value = $row.find('.hex_value').text();

    $.ajax({
        url: '/Admin/SaveMachineStatusColor',
        type: 'POST',
        data: { status_id: status_id, status_color: status_color, hex_value: hex_value },
        success: function (response) {
            Swal.fire({
                title: 'Success',
                text: response.message,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                //hide update button
                refreshTable();
            });
        },
        error: function (xhr) {
            Swal.fire({
                title: 'Error',
                text: xhr.responseText || xhr.message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}


function refreshTable() {
    $.get("/Admin/RefreshStatusColorTable", function (html) {
        $("#tblBody").html(html);
        initializeColorPickers();
    });
}

