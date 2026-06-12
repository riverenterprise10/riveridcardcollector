# Simple PowerShell Static File Web Server
$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server running on http://localhost:$port/"

function Get-MimeType($extension) {
    switch ($extension) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".svg"  { return "image/svg+xml" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        default { return "application/octet-stream" }
    }
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }
        
        # Build absolute path
        $relativePath = $urlPath.TrimStart('/')
        $localPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($PSScriptRoot, $relativePath))
        
        if (Test-Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath)
            $response.ContentType = Get-MimeType $ext
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $html = "<html><body><h1>404 Not Found: $urlPath</h1></body></html>"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Error occurred: $_"
} finally {
    $listener.Stop()
}
