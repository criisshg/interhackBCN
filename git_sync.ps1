git stash
git checkout main
git pull origin main
git checkout p1-ml
git rebase main
git stash pop
git add .
git commit -m "feat(ml): f0 y f1 completados (etl, clasificacion, señales y orquestador)"
git push origin p1-ml
