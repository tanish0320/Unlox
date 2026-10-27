import pytest
from PIL import Image, ImageDraw
from backend.app.services.exporter.video_exporter import FrameRenderer
from backend.app.schemas.provisional_lesson import DiagramScene

def test_frame_renderer_flowchart_layout_3_nodes():
    renderer = FrameRenderer()
    scene = DiagramScene(
        id="s1",
        heading="Test 3 Nodes",
        narration="Testing 3 nodes flowchart layout.",
        type="diagram",
        diagram_type="flowchart",
        items=["Input Data", "Process Calculations", "Generate Output"]
    )
    frame = renderer.render_frame(scene, time_seconds=1.0, duration_seconds=5.0)
    assert frame is not None
    assert frame.size == (1280, 720)

def test_frame_renderer_flowchart_layout_4_nodes_long_labels():
    renderer = FrameRenderer()
    scene = DiagramScene(
        id="s2",
        heading="Test 4 Nodes Long Labels",
        narration="Testing 4 nodes with long labels multi row layout.",
        type="diagram",
        diagram_type="flowchart",
        items=[
            "Step 1: Capture Sunlight Energy in Chloroplasts",
            "Step 2: Water Splitting Photolysis and Oxygen Release",
            "Step 3: ATP and NADPH Energy Transfer",
            "Step 4: Carbon Fixation in Calvin Cycle Synthesizing Glucose"
        ]
    )
    frame = renderer.render_frame(scene, time_seconds=2.5, duration_seconds=5.0)
    assert frame is not None
    assert frame.size == (1280, 720)

def test_frame_renderer_flowchart_layout_6_nodes():
    renderer = FrameRenderer()
    scene = DiagramScene(
        id="s3",
        heading="Test 6 Nodes Multi Row",
        narration="Testing 6 nodes multi row flowchart layout.",
        type="diagram",
        diagram_type="flowchart",
        items=["Init", "Read", "Parse", "Validate", "Transform", "Export"]
    )
    frame = renderer.render_frame(scene, time_seconds=4.0, duration_seconds=5.0)
    assert frame is not None
    assert frame.size == (1280, 720)
