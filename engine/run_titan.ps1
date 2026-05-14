# TITAN quick-launch for testing
# Pipes credentials via stdin (same as production launcher)

$key  = "AIzaSyDg0kjqTqdeP7Mq3IfOcrePOdgXDh1djZE"
$lang = "Java"

$payload = "{`"gemini_key`":`"$key`",`"language`":`"$lang`"}"

$payload | & ".\dist\oas\oas.py"

