# Git Flow Scenario Practice Sheet

**Week:** Week 08 - Git Flow Exercises
**Purpose:** Practice advanced Git workflows for real-world scenarios

---

## Scenario 1: Feature Branch Rebase

### Context
You started a feature branch `feature/user-auth` from main. Meanwhile, other team members pushed commits to main. You need to update your branch.

### Initial State
```
main:      A---B---C---D
                  \
feature:               E---F---G
```

### Goal
Rebase feature branch onto latest main to get linear history.

### Commands
```bash
# 1. Ensure on feature branch
git checkout feature/user-auth

# 2. Fetch latest from remote
git fetch origin

# 3. Rebase onto main
git rebase origin/main

# 4. Resolve conflicts if any, then:
git add .
git rebase --continue

# 5. Force push (since we rewrote history)
git push --force-with-lease origin feature/user-auth
```

### Expected Result
```
main:      A---B---C---D
                       \
feature:                    E'--F'--G'
```

---

## Scenario 2: Interactive Rebase - Clean Up Commits

### Context
You have a messy commit history with multiple "WIP" and "fix" commits. You need to clean it up before creating a PR.

### Initial State
```
A---B---C---D---E---F---G (HEAD)
```

### Goal
Combine related commits into meaningful ones.

### Commands
```bash
# Start interactive rebase for last 5 commits
git rebase -i HEAD~5

# In editor, reorder and combine:
# pick abc1234 Add user authentication
# squash def5678 WIP
# squash ghi9012 fix typo
# pick jkl3456 Add login page
# squash mno6789 Fix CSS

# Save and close editor
# Edit combined commit messages
```

### Commit Message Guidelines
- First line: Imperative, under 50 chars
- Blank line
- Detailed description if needed

---

## Scenario 3: Cherry-pick Hotfix

### Context
A critical bug was discovered in production. You fixed it on a hotfix branch, but need to apply that fix to both `main` and `release/v1.2` branches.

### Initial State
```
main:      A---B---C---D
release:   A---B---C---E---F
hotfix:                     G---H (critical fix)
```

### Goal
Apply commits G and H to main and release branches.

### Commands
```bash
# Apply to main
git checkout main
git cherry-pick G H

# Apply to release
git checkout release/v1.2
git cherry-pick G H

# Push both branches
git push origin main
git push origin release/v1.2
```

### Result
```
main:      A---B---C---D---G'--H'
release:   A---B---C---E---F---G'--H'
```

---

## Scenario 4: Reset to Recover

### Context
You accidentally made commits to main instead of a feature branch, and haven't pushed yet.

### Initial State
```
main: A---B---C---D---E---F (HEAD)
```

### Goal
Move commits E and F to a new feature branch.

### Commands
```bash
# 1. Create branch from current position
git branch feature/new-feature

# 2. Reset main back to commit D
git reset --hard D

# 3. Switch to feature branch
git checkout feature/new-feature

# Verify
git log --oneline
```

### Result
```
main:      A---B---C---D (HEAD)
feature:  A---B---C---D---E---F
```

---

## Scenario 5: Submodule Management

### Context
Your project uses an external utilities library as a submodule. You need to update it to a specific version.

### Initial State
```
libs/utils -> commit abc1234 (v1.0.0)
```

### Goal
Update to v2.0.0 of the utilities library.

### Commands
```bash
# 1. Navigate to submodule
cd libs/utils

# 2. Check available versions
git fetch origin
git tag

# 3. Checkout specific version
git checkout v2.0.0

# 4. Return to main repo
cd ../..

# 5. Stage submodule change
git add libs/utils

# 6. Commit
git commit -m "Update utils submodule to v2.0.0"
```

### Alternative: Use submodule update
```bash
# If you know the commit directly
git submodule update --remote libs/utils
git add libs/utils
git commit -m "Update utils to latest"
```

---

## Scenario 6: Worktree for Parallel Work

### Context
You're working on a feature but need to quickly create a hotfix without disturbing your current work.

### Initial State
```
feature/auth (in progress with uncommitted changes)
```

### Goal
Create a worktree for hotfix without affecting current work.

### Commands
```bash
# 1. Create worktree for hotfix
git worktree add ../hotfix-branch main

# 2. Navigate to worktree
cd ../hotfix-branch

# 3. Create and work on hotfix
git checkout -b hotfix/urgent-fix

# ... make changes ...
git add .
git commit -m "Fix critical issue"

# 4. Push hotfix
git push origin hotfix/urgent-fix

# 5. Return to original worktree
cd ../main-repo
git checkout feature/auth
```

---

## Scenario 7: Recover from Mistakes

### Context
You did a hard reset and lost commits, then closed the terminal. You need to recover.

### Commands
```bash
# 1. View reflog to find lost commits
git reflog

# Output example:
# abc1234 HEAD@{0}: reset: moving to HEAD~3
# def5678 HEAD@{1}: commit: Important work
# ghi9012 HEAD@{2}: commit: More work

# 2. Recover the commit
git checkout def5678
# OR
git reset --hard def5678
```

### Alternative: Use git fsck
```bash
# Find dangling commits
git fsck --lost-found

# Examine found objects
git show <commit-hash>
```

---

## Practice Checklist

- [ ] Completed Scenario 1 (Rebase feature branch)
- [ ] Completed Scenario 2 (Interactive rebase)
- [ ] Completed Scenario 3 (Cherry-pick hotfix)
- [ ] Completed Scenario 4 (Reset for recovery)
- [ ] Completed Scenario 5 (Submodule update)
- [ ] Completed Scenario 6 (Worktree parallel work)
- [ ] Completed Scenario 7 (Recover lost commits)

---

## Key Takeaways

1. **Rebase** creates clean, linear history but rewrites commits
2. **Cherry-pick** applies specific commits without merging entire branches
3. **Reset** moves HEAD and can discard changes - use with caution
4. **Submodules** maintain separate repo version control
5. **Worktrees** enable parallel branch work from single repo
6. **Reflog** is your safety net for recovery operations