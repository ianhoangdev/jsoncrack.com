import React, { useState } from "react";
import styled from "styled-components";
// Glass-like button style
const GlassButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: #222;
  padding: 8px 20px;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1.5px 6px rgba(0,0,0,0.04);
  backdrop-filter: blur(8px);
  transition: background 0.2s, box-shadow 0.2s, color 0.2s;
  cursor: pointer;
  margin-right: 8px;
  outline: none;
  &:hover {
    background: rgba(255,255,255,0.25);
    color: #111;
    box-shadow: 0 6px 32px rgba(0,0,0,0.12);
  }
  &:active {
    background: rgba(255,255,255,0.18);
    color: #333;
  }
`;
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const nodes = useGraph(state => state.nodes);
  const setGraph = useGraph(state => state.setGraph);
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const json = useJson(state => state.json);
  const setJson = useJson(state => state.setJson);
  const [editing, setEditing] = useState(false);
  // Store all editable values as an array, but only for string, number, null
  const [editValues, setEditValues] = useState<Array<string | number | null>>([]);

  React.useEffect(() => {
    setEditValues(
      nodeData?.text?.map(row =>
        typeof row.value === "string" || typeof row.value === "number" || row.value === null
          ? row.value
          : ""
      ) ?? []
    );
    setEditing(false);
  }, [nodeData]);

  // Update only string, number, null values in JSON
  const updateJsonValues = (newValues: Array<string | number | null>) => {
    if (!nodeData) return;
    try {
      const parsed = JSON.parse(json);
      let ref = parsed;
      const path = nodeData.path;
      if (path && path.length > 0) {
        for (let i = 0; i < path.length - 1; i++) {
          ref = ref[path[i]];
        }
        nodeData.text.forEach((row, idx) => {
          const isEditable = typeof row.value === "string" || typeof row.value === "number" || row.value === null;
          if (!isEditable) return; // skip non-editables
          if (row.key) {
            if (typeof ref[path[path.length - 1]] === "object" && ref[path[path.length - 1]] !== null) {
              ref[path[path.length - 1]][row.key] = newValues[idx];
            } else {
              ref[path[path.length - 1]] = newValues[idx];
            }
          } else {
            ref[path[path.length - 1]] = newValues[idx];
          }
        });
      }
      setJson(JSON.stringify(parsed, null, 2));
    } catch (e) {}
  };

  const handleEdit = () => {
    setEditing(true);
    setEditValues(
      nodeData?.text?.map(row =>
        typeof row.value === "string" || typeof row.value === "number" || row.value === null
          ? row.value
          : ""
      ) ?? []
    );
  };

  const handleSave = () => {
    if (!nodeData) return;
    // Update node value in graph, only for string, number, null
    const updatedNodes = nodes.map(n => {
      if (n.id === nodeData.id) {
        const newText = n.text.map((row, idx) => {
          const isEditable = typeof row.value === "string" || typeof row.value === "number" || row.value === null;
          return isEditable ? { ...row, value: editValues[idx] } : row;
        });
        return { ...n, text: newText };
      }
      return n;
    });
    setGraph(undefined, [{ nodes: updatedNodes }]);
    updateJsonValues(editValues);
    setEditing(false);
    setSelectedNode({ ...nodeData, text: nodeData.text.map((row, idx) => {
      const isEditable = typeof row.value === "string" || typeof row.value === "number" || row.value === null;
      return isEditable ? { ...row, value: editValues[idx] } : row;
    }), id: nodeData.id });
  };

  const handleCancel = () => {
    setEditing(false);
    setEditValues(
      nodeData?.text?.map(row =>
        typeof row.value === "string" || typeof row.value === "number" || row.value === null
          ? row.value
          : ""
      ) ?? []
    );
  };

  if (!nodeData) return null;
  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <CloseButton onClick={onClose} />
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {editing ? (
              <Stack gap="xs">
                {nodeData.text.map((row, idx) => {
                  const isEditable = typeof row.value === "string" || typeof row.value === "number" || row.value === null;
                  return (
                    <Flex key={row.key ?? idx} align="center" gap="sm" mb={4}>
                      <Text fz="sm" fw={500} style={{ minWidth: 80 }}>{row.key ?? "Value"}:</Text>
                      {isEditable ? (
                        <input
                          type="text"
                          value={editValues[idx] as string}
                          onChange={e => {
                            const newVals = [...editValues];
                            newVals[idx] = e.target.value;
                            setEditValues(newVals);
                          }}
                          style={{ width: "120px", marginRight: "8px" }}
                        />
                      ) : (
                        <Text fz="sm" c="dimmed" style={{ minWidth: 120 }}>[Nested/Boolean]</Text>
                      )}
                    </Flex>
                  );
                })}
                <Flex gap="sm">
                  <GlassButton onClick={handleSave}>Save</GlassButton>
                  <GlassButton onClick={handleCancel}>Cancel</GlassButton>
                </Flex>
              </Stack>
            ) : (
              <Flex align="center" gap="sm">
                <CodeHighlight
                  code={normalizeNodeData(nodeData.text ?? [])}
                  miw={350}
                  maw={600}
                  language="json"
                  withCopyButton
                />
                <GlassButton onClick={handleEdit} style={{ marginLeft: "8px" }}>Edit</GlassButton>
              </Flex>
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
