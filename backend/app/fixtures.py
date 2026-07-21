from __future__ import annotations

from dataclasses import dataclass
import unicodedata


@dataclass(frozen=True)
class FixtureCast:
    name: str
    character: str


@dataclass(frozen=True)
class FixtureMovie:
    id: int
    title: str
    overview: str
    release_date: str
    cast: tuple[FixtureCast, ...]


FIXTURE_MOVIES: tuple[FixtureMovie, ...] = (
    FixtureMovie(
        id=603,
        title="The Matrix",
        overview="A hacker discovers that reality is a simulation and joins a resistance against the machines controlling humanity.",
        release_date="1999-03-31",
        cast=(
            FixtureCast("Keanu Reeves", "Neo"),
            FixtureCast("Carrie-Anne Moss", "Trinity"),
            FixtureCast("Laurence Fishburne", "Morpheus"),
            FixtureCast("Hugo Weaving", "Agent Smith"),
        ),
    ),
    FixtureMovie(
        id=27205,
        title="Inception",
        overview="A skilled thief enters dreams to steal secrets, but a final mission forces him to plant an idea instead of taking one.",
        release_date="2010-07-16",
        cast=(
            FixtureCast("Leonardo DiCaprio", "Cobb"),
            FixtureCast("Joseph Gordon-Levitt", "Arthur"),
            FixtureCast("Elliot Page", "Ariadne"),
            FixtureCast("Tom Hardy", "Eames"),
        ),
    ),
    FixtureMovie(
        id=157336,
        title="Interstellar",
        overview="A team of explorers travels beyond Earth's limits to find a new home for humanity.",
        release_date="2014-11-07",
        cast=(
            FixtureCast("Matthew McConaughey", "Cooper"),
            FixtureCast("Anne Hathaway", "Brand"),
            FixtureCast("Jessica Chastain", "Murph"),
            FixtureCast("Michael Caine", "Professor Brand"),
        ),
    ),
    FixtureMovie(
        id=155,
        title="The Dark Knight",
        overview="Batman faces a chaotic criminal mastermind who pushes Gotham to the edge.",
        release_date="2008-07-18",
        cast=(
            FixtureCast("Christian Bale", "Bruce Wayne"),
            FixtureCast("Heath Ledger", "Joker"),
            FixtureCast("Aaron Eckhart", "Harvey Dent"),
            FixtureCast("Maggie Gyllenhaal", "Rachel Dawes"),
        ),
    ),
    FixtureMovie(
        id=13,
        title="Forrest Gump",
        overview="A kind-hearted man witnesses decades of American history while living an unexpectedly extraordinary life.",
        release_date="1994-07-06",
        cast=(
            FixtureCast("Tom Hanks", "Forrest Gump"),
            FixtureCast("Robin Wright", "Jenny Curran"),
            FixtureCast("Gary Sinise", "Lieutenant Dan"),
            FixtureCast("Sally Field", "Mrs. Gump"),
        ),
    ),
    FixtureMovie(
        id=680,
        title="Pulp Fiction",
        overview="Separate criminal stories intertwine through sharp dialogue, chance encounters, and dark humor.",
        release_date="1994-10-14",
        cast=(
            FixtureCast("John Travolta", "Vincent Vega"),
            FixtureCast("Samuel L. Jackson", "Jules Winnfield"),
            FixtureCast("Uma Thurman", "Mia Wallace"),
            FixtureCast("Bruce Willis", "Butch Coolidge"),
        ),
    ),
    FixtureMovie(
        id=1557,
        title="Whiplash",
        overview="A driven drummer tries to prove himself under a ruthless mentor who demands perfection.",
        release_date="2014-10-10",
        cast=(
            FixtureCast("Miles Teller", "Andrew Neiman"),
            FixtureCast("J.K. Simmons", "Terence Fletcher"),
            FixtureCast("Melissa Benoist", "Nicole"),
            FixtureCast("Paul Reiser", "Jim Neiman"),
        ),
    ),
    FixtureMovie(
        id=496243,
        title="Parasite",
        overview="Two families from very different worlds become entangled in a tense relationship built on deception and ambition.",
        release_date="2019-05-30",
        cast=(
            FixtureCast("Song Kang-ho", "Ki-taek"),
            FixtureCast("Lee Sun-kyun", "Dong-ik"),
            FixtureCast("Cho Yeo-jeong", "Yeon-kyo"),
            FixtureCast("Choi Woo-shik", "Ki-woo"),
        ),
    ),
)

MOVIES_BY_ID = {movie.id: movie for movie in FIXTURE_MOVIES}


def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn").casefold()


def search_movies(query: str) -> list[FixtureMovie]:
    needle = _normalize(query.strip())
    if not needle:
        return list(FIXTURE_MOVIES)

    scored: list[tuple[int, FixtureMovie]] = []
    for movie in FIXTURE_MOVIES:
        haystack = " ".join(
            [
                movie.title,
                movie.overview,
                " ".join(cast.name for cast in movie.cast),
                " ".join(cast.character for cast in movie.cast),
            ]
        )
        normalized = _normalize(haystack)
        if needle in normalized:
            title_priority = 0 if _normalize(movie.title).startswith(needle) else 1
            scored.append((title_priority, movie))

    scored.sort(key=lambda item: (item[0], item[1].title))
    return [movie for _, movie in scored]


def get_movie(movie_id: int) -> FixtureMovie | None:
    return MOVIES_BY_ID.get(movie_id)
