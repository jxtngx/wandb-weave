import typing

import weave
from .. import weave_internal


@weave.type()
class PyBoardSeedBoardConfig:
    pass


@weave.op(  # type: ignore
    name="py_board-seed_board",
)
def seed_board(
    input_node: weave.Node[typing.Any],
    config: typing.Optional[PyBoardSeedBoardConfig] = None,
) -> weave.panels.Group:
    control_items = [
        weave.panels.GroupPanel(
            input_node,
            id="data",
        ),
    ]

    panels = [
        weave.panels.BoardPanel(
            weave_internal.make_var_node(input_node.type, "data"),
            id="table",
            layout=weave.panels.BoardPanelLayout(x=0, y=0, w=24, h=6),
        ),
    ]
    return weave.panels.Board(vars=control_items, panels=panels)
