package app

import "testing"

func TestEscapeHTML_Ampersand(t *testing.T) {
	if got := escapeHTML("A&B"); got != "A&amp;B" {
		t.Errorf("expected 'A&amp;B', got %q", got)
	}
}

func TestEscapeHTML_AngleBrackets(t *testing.T) {
	if got := escapeHTML("<b>"); got != "&lt;b&gt;" {
		t.Errorf("expected '&lt;b&gt;', got %q", got)
	}
}

func TestEscapeHTML_Combined(t *testing.T) {
	if got := escapeHTML("a<b>&c"); got != "a&lt;b&gt;&amp;c" {
		t.Errorf("expected 'a&lt;b&gt;&amp;c', got %q", got)
	}
}

func TestEscapeHTML_NoSpecialChars(t *testing.T) {
	if got := escapeHTML("hello"); got != "hello" {
		t.Errorf("expected 'hello', got %q", got)
	}
}

func TestEscapeHTML_Empty(t *testing.T) {
	if got := escapeHTML(""); got != "" {
		t.Errorf("expected empty string, got %q", got)
	}
}
