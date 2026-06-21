$connections = netstat -ano | Select-String ":5000"
foreach ($line in $connections) {
    if ($line -match "LISTENING") {
        $parts = $line.ToString().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
        $processId = $parts[-1]
        Write-Host "Killing process on port 5000 with PID: $processId"
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "Could not kill PID $processId"
        }
    }
}
Write-Host "Starting server..."
npm start
