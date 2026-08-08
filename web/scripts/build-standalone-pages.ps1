$ErrorActionPreference = 'Stop'
$packageRoot = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\public'
$utf8 = [Text.UTF8Encoding]::new($false)

function Inline-ScriptTag {
  param(
    [string]$Html,
    [string]$Source,
    [string]$JavaScript,
    [string]$Marker,
    [string]$Signature
  )
  $escapedSource = [regex]::Escape($Source)
  $sourcePattern = '<script\s+src="' + $escapedSource + '"\s*>\s*</script>'
  $escapedMarker = [regex]::Escape($Marker)
  $markerPattern = '(?s)<!--\s*' + $escapedMarker + '\s+START\s*-->.*?<!--\s*' + $escapedMarker + '\s+END\s*-->'
  $legacyPattern = '(?s)<script>\s*' + [regex]::Escape($Signature) + '.*?</script>'
  $inline = "<!-- $Marker START -->`r`n<script>`r`n" + $JavaScript + "`r`n</script>`r`n<!-- $Marker END -->"

  if ([regex]::IsMatch($Html, $markerPattern)) {
    return [regex]::Replace($Html, $markerPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $inline }, 1)
  }
  if ([regex]::IsMatch($Html, $sourcePattern)) {
    return [regex]::Replace($Html, $sourcePattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $inline }, 1)
  }
  return [regex]::Replace($Html, $legacyPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $inline }, 1)
}

# THE canonical nav. Prepended to each consuming script rather than given its own
# marker, so the 32 generated pages need no edit to pick it up -- editing those
# outputs by hand is exactly what stripped the h1 and a third of the content from
# 21 goals pages once already. Source of truth, kept in step with NAV_TOP in
# web/src/components/MarketingShell.jsx.
$navScript = [IO.File]::ReadAllText((Join-Path $packageRoot 'gg-nav.js'))

# goal-story.js interpolates ggNavHtml()/ggFooterHtml() while building the page
# shell, so the nav module has to be defined ahead of it in the same block.
$goalScript = $navScript + "`r`n" + [IO.File]::ReadAllText((Join-Path $packageRoot 'goals\goal-story.js'))
Get-ChildItem (Join-Path $packageRoot 'goals') -Filter '*.html' | ForEach-Object {
  $html = [IO.File]::ReadAllText($_.FullName)
  $html = Inline-ScriptTag -Html $html -Source 'goal-story.js' -JavaScript $goalScript -Marker 'GOAL_STORY_INLINE' -Signature 'const GOALS = {'
  [IO.File]::WriteAllText($_.FullName, $html, $utf8)
}

$resourceScript = [IO.File]::ReadAllText((Join-Path $packageRoot 'resources\resource-page.js'))
$resourceNavScript = $navScript + "`r`n" + [IO.File]::ReadAllText((Join-Path $packageRoot 'resources\resource-nav.js'))
Get-ChildItem (Join-Path $packageRoot 'resources') -Recurse -Filter '*.html' | ForEach-Object {
  $html = [IO.File]::ReadAllText($_.FullName)
  if ($_.Directory.Name -eq 'guides') {
    $html = Inline-ScriptTag -Html $html -Source '../resource-page.js' -JavaScript $resourceScript -Marker 'RESOURCE_PAGE_INLINE' -Signature 'const PAGES={'
    $html = Inline-ScriptTag -Html $html -Source '../resource-nav.js' -JavaScript $resourceNavScript -Marker 'RESOURCE_NAV_INLINE' -Signature '(() => {'
  } else {
    $html = Inline-ScriptTag -Html $html -Source 'resource-page.js' -JavaScript $resourceScript -Marker 'RESOURCE_PAGE_INLINE' -Signature 'const PAGES={'
    $html = Inline-ScriptTag -Html $html -Source 'resource-nav.js' -JavaScript $resourceNavScript -Marker 'RESOURCE_NAV_INLINE' -Signature '(() => {'
  }
  [IO.File]::WriteAllText($_.FullName, $html, $utf8)
}


# sitemap.html sits outside goals/ and resources/ but carries the same .wrap nav
# container, so it gets the identical nav module and mount call. Without this it
# would be the one page still free to drift.
$sitemap = Join-Path $packageRoot 'sitemap.html'
if (Test-Path $sitemap) {
  $html = [IO.File]::ReadAllText($sitemap)
  $html = Inline-ScriptTag -Html $html -Source 'gg-nav.js' -JavaScript $resourceNavScript -Marker 'GG_NAV_INLINE' -Signature '(() => {'
  [IO.File]::WriteAllText($sitemap, $html, $utf8)
}
Write-Output 'Standalone pages rebuilt.'
