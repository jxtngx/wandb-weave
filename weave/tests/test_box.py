import datetime

from weave.legacy import box


def test_boxdatetime():
    dt = datetime.datetime.now()
    boxed = box.box(dt)
    assert box.unbox(boxed) == dt
