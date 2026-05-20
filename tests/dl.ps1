$FileID = "18v0witmLhl4vqGgfyI7gMExXJwPUIVRS"
$url = "https://drive.google.com/uc?export=download&id=$FileID"
$req = Invoke-WebRequest -Uri $url -SessionVariable session -UseBasicParsing
$uuid = if ($req.Content -match 'name="uuid" value="([^"]+)"') { $matches[1] } else { "" }
$action = if ($req.Content -match 'action="([^"]+)"') { $matches[1] } else { "" }
$action = if ($action -notmatch "^http") { "https://drive.usercontent.google.com$action" } else { $action }
$final = "$action`?id=$FileID&export=download&confirm=t&uuid=$uuid"
Write-Host "Downloading from: $final"
Invoke-WebRequest -Uri $final -WebSession $session -OutFile "test.exe" -UseBasicParsing
$f = Get-Item "test.exe"
Write-Host "Size: $([math]::Round($f.Length/1MB,1)) MB"
