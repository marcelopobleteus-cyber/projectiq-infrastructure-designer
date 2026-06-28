$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$filePath = "C:\Users\marce\Downloads\WST_SEG6_IP_VLAN - Coordinates.xlsx"
$workbook = $excel.Workbooks.Open($filePath)
$sheet = $workbook.Sheets.Item(1)

$rows = @()
for ($r = 7; $r -le 23; $r++) {
    $row_data = [PSCustomObject]@{
        row_num = $r
        device_id = $sheet.Cells.Item($r, 1).Text
        ip_address = $sheet.Cells.Item($r, 2).Text
        subnet_mask = $sheet.Cells.Item($r, 3).Text
        default_gateway = $sheet.Cells.Item($r, 4).Text
        vlan = $sheet.Cells.Item($r, 5).Text
        mac_address = $sheet.Cells.Item($r, 6).Text
        lat = $sheet.Cells.Item($r, 7).Text
        lon = $sheet.Cells.Item($r, 8).Text
        camera_macs = $sheet.Cells.Item($r, 9).Text
    }
    $rows += $row_data
}

$workbook.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

$rows | ConvertTo-Json | Write-Output
