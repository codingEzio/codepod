import { useCallback, useEffect, useState, useContext } from "react";
import { applyNodeChanges, Node } from "reactflow";
import { RepoContext, RoleType } from "./store";
import { useStore } from "zustand";

const isNodeAddChange = (change) => change.type === "add";
const isNodeRemoveChange = (change) => change.type === "remove";
const isNodeResetChange = (change) => change.type === "reset";

const selectedPods = new Set();

// apply the same-parent rule, make sure all selected nodes have the same parent
export var parent: string | undefined = undefined;

// clear all selections
export function resetSelection() {
  if (selectedPods.size === 0) return false;
  selectedPods.clear();
  parent = undefined;
  return true;
}

export function useNodesStateSynced(nodeList) {
  const store = useContext(RepoContext);
  if (!store) throw new Error("Missing BearContext.Provider in the tree");
  const addPod = useStore(store, (state) => state.addPod);
  const getPod = useStore(store, (state) => state.getPod);
  const deletePod = useStore(store, (state) => state.deletePod);
  const updatePod = useStore(store, (state) => state.updatePod);
  const role = useStore(store, (state) => state.role);
  const ydoc = useStore(store, (state) => state.ydoc);
  const nodesMap = ydoc.getMap<Node>("pods");
  const clientId = useStore(
    store,
    (state) => state.provider?.awareness?.clientID
  );

  const [nodes, setNodes] = useState(nodeList);
  // const setNodeId = useStore((state) => state.setSelectNode);
  // const selected = useStore((state) => state.selectNode);

  function selectPod(id, selected) {
    if (selected) {
      const p = getPod(id)?.parent;

      // if you select a node that has a different parent, clear all previous selections
      if (parent !== undefined && parent !== p) {
        selectedPods.clear();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      }
      parent = p;
      selectedPods.add(id);
    } else {
      if (!selectedPods.delete(id)) return;
      if (selectedPods.size === 0) parent = undefined;
    }
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, selected } : n)));
  }

  const onNodesChanges = useCallback((changes) => {
    const nodes = Array.from(nodesMap.values());

    const nextNodes = applyNodeChanges(changes, nodes);

    // prevent updates from guest users
    if (role === RoleType.GUEST) {
      setNodes(nextNodes);
      return;
    }

    changes.forEach((change) => {
      if (!isNodeAddChange(change)) {
        if (isNodeRemoveChange(change)) {
          nodesMap.delete(change.id);
          return;
        }
        const node = nextNodes.find((n) => n.id === change.id);

        if (!node) return;

        if (isNodeResetChange(change) || change.type === "select") {
          selectPod(node.id, change.selected);
          return;
        }

        if (change.type === "dimensions" && node.type === "code") {
          // There is a (seemingly unnecessary) dimension change at the very
          // beginning of canvas page, which causes dirty status of all
          // CodeNodes to be set. This is a workaround to prevent that.
          if (getPod(node.id).width !== node.width) {
            // only sync width
            updatePod({
              id: node.id,
              data: {
                width: node.style?.width as number,
              },
            });
          }
          return;
        }

        if (node) {
          nodesMap.set(change.id, node);
        }
      }
    });
  }, []);

  useEffect(() => {
    const observer = (YMapEvent) => {
      YMapEvent.changes.keys.forEach((change, key) => {
        if (change.action === "add") {
          const node = nodesMap.get(key);
          if (!node || node.data?.clientId || getPod(key)) return;
          addPod(null, {
            id: node.id,
            children: [],
            parent: "ROOT",
            type: node.type === "code" ? "CODE" : "DECK",
            lang: "python",
            x: node.position.x,
            y: node.position.y,
            width: node.style?.width as number,
            height: node.style?.height as number,
            name: node.data?.name,
            dirty: false,
          });
        } else if (change.action === "delete") {
          const node = change.oldValue;
          console.log("todelete", node);
          deletePod(null, { id: node.id, toDelete: [] });
        }
      });

      // TOFIX: a node may be shadowed behind its parent, due to the order to render reactflow node, to fix this, comment out the following sorted method, which brings in a large overhead.
      setNodes(
        Array.from(nodesMap.values())
          .filter(
            (node) =>
              !node.data.hasOwnProperty("clientId") ||
              node.data.clientId === clientId
          )
          .sort((a: Node & { level }, b: Node & { level }) => a.level - b.level)
          .map((node) => ({
            ...node,
            selected: selectedPods.has(node.id),
            hidden: node.data?.hidden === clientId,
          }))
      );

      // setNodes(Array.from(nodesMap.values()));
    };

    // setNodes(Array.from(nodesMap.values()));
    nodesMap.observe(observer);

    return () => {
      nodesMap.unobserve(observer);
      resetSelection();
    };
  }, []);

  return [nodes.filter((n) => n), setNodes, onNodesChanges];
}
