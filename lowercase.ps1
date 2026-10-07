Get-ChildItem -Path "Source" -Recurse | ForEach-Object {
    $lower = $_.Name.ToLower().Replace("_", "-").Replace("--","-").Replace("--","-").Replace("summon-nature-s-ally","summon-natures-ally")
    if ($_.Name -cne $lower) {
        $temp = "$($_.FullName).tmp_rename"
        Rename-Item $_.FullName $temp
        Rename-Item $temp $lower
    }
}