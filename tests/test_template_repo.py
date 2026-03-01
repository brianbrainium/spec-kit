"""Tests for template repository override and URL construction."""

import pytest

from specify_cli import (
    _latest_release_api_url,
    _resolve_template_repo,
    _validate_template_repo,
)


class TestValidateTemplateRepo:
    def test_valid_template_repo(self):
        assert _validate_template_repo("github/spec-kit") == ("github", "spec-kit")
        assert _validate_template_repo("my-org/repo_1.2") == ("my-org", "repo_1.2")

    @pytest.mark.parametrize(
        "value",
        [
            "",
            "github",
            "github/spec/kit",
            "/spec-kit",
            "github/",
            "git hub/spec-kit",
            "github/spec?kit",
        ],
    )
    def test_invalid_template_repo(self, value):
        with pytest.raises(ValueError):
            _validate_template_repo(value)


class TestResolveTemplateRepo:
    def test_cli_beats_env(self, monkeypatch):
        monkeypatch.setenv("SPECIFY_TEMPLATE_REPO", "env-owner/env-repo")
        assert _resolve_template_repo("cli-owner/cli-repo") == ("cli-owner", "cli-repo")

    def test_env_beats_default(self, monkeypatch):
        monkeypatch.setenv("SPECIFY_TEMPLATE_REPO", "env-owner/env-repo")
        assert _resolve_template_repo(None) == ("env-owner", "env-repo")

    def test_default_when_no_override(self, monkeypatch):
        monkeypatch.delenv("SPECIFY_TEMPLATE_REPO", raising=False)
        assert _resolve_template_repo(None) == ("github", "spec-kit")


class TestLatestReleaseApiUrl:
    def test_uses_overridden_owner_repo(self):
        owner, repo = _resolve_template_repo("fork-owner/custom-spec-kit")
        assert (
            _latest_release_api_url(owner, repo)
            == "https://api.github.com/repos/fork-owner/custom-spec-kit/releases/latest"
        )
