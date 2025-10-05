@echo off
echo Copying contract ABIs to frontend...

xcopy /Y "artifacts\contracts\Voting.sol\Voting.json" "frontend\src\contracts\"
xcopy /Y "artifacts\contracts\BALToken.sol\BALToken.json" "frontend\src\contracts\"
xcopy /Y "artifacts\contracts\CandidateNFT.sol\CandidateNFT.json" "frontend\src\contracts\"

echo Done!
pause