import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";

interface PeptideVisualizationModalProps {
  isOpen: boolean;
  sequence: string;
  onClose: () => void;
}

export function PeptideVisualizationModal({
  isOpen,
  sequence,
  onClose,
}: PeptideVisualizationModalProps) {
  const [activeTab, setActiveTab] = useState("properties");

  const { data: visualization, isLoading } = trpc.peptideVisualization.getVisualization.useQuery(
    { sequence },
    { enabled: isOpen && !!sequence }
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>多肽可视化: {sequence}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : visualization ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="properties">序列性质</TabsTrigger>
              <TabsTrigger value="secondary">二级结构</TabsTrigger>
              <TabsTrigger value="structure3d">3D 结构</TabsTrigger>
            </TabsList>

            {/* Sequence Properties Tab */}
            <TabsContent value="properties" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>序列性质分析</CardTitle>
                  <CardDescription>基于标准生化标度的性质计算</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-slate-600">平均疏水性</div>
                        <div className="text-2xl font-bold">
                          {visualization.properties.avgHydrophobicity.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-slate-600">平均电荷</div>
                        <div className="text-2xl font-bold">
                          {visualization.properties.avgCharge.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-slate-600">等电点</div>
                        <div className="text-2xl font-bold">
                          {visualization.properties.isoelectricPoint.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-slate-600">序列长度</div>
                        <div className="text-2xl font-bold">{sequence.length}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Property Charts */}
                  <div className="space-y-4">
                    <PropertyChart
                      title="疏水性分布"
                      values={visualization.properties.hydrophobicity}
                      color="bg-blue-500"
                    />
                    <PropertyChart
                      title="电荷分布"
                      values={visualization.properties.charge}
                      color="bg-red-500"
                    />
                    <PropertyChart
                      title="极性分布"
                      values={visualization.properties.polarity}
                      color="bg-green-500"
                    />
                  </div>

                  {/* Amino Acid Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-2 py-1 text-left">位置</th>
                          <th className="px-2 py-1 text-left">氨基酸</th>
                          <th className="px-2 py-1 text-right">疏水性</th>
                          <th className="px-2 py-1 text-right">电荷</th>
                          <th className="px-2 py-1 text-right">极性</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sequence.split("").map((aa, i) => (
                          <tr key={i} className="border-b hover:bg-slate-50">
                            <td className="px-2 py-1">{i + 1}</td>
                            <td className="px-2 py-1 font-mono">{aa}</td>
                            <td className="px-2 py-1 text-right">
                              {visualization.properties.hydrophobicity[i]?.toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {visualization.properties.charge[i]?.toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {visualization.properties.polarity[i]?.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Secondary Structure Tab */}
            <TabsContent value="secondary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>二级结构预测</CardTitle>
                  <CardDescription>基于启发式方法的预测</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Structure Composition */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-slate-600">α-螺旋</div>
                        <div className="text-2xl font-bold">
                          {(visualization.secondaryStructure.helix * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-slate-600">β-折叠</div>
                        <div className="text-2xl font-bold">
                          {(visualization.secondaryStructure.sheet * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-slate-600">线圈</div>
                        <div className="text-2xl font-bold">
                          {(visualization.secondaryStructure.coil * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Prediction String */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">预测结构 (H=螺旋, E=折叠, C=线圈)</label>
                    <div className="bg-slate-100 p-4 rounded font-mono text-sm break-all">
                      {visualization.secondaryStructure.prediction}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span>H - α-螺旋</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span>E - β-折叠</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-500 rounded"></div>
                      <span>C - 线圈</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3D Structure Tab */}
            <TabsContent value="structure3d" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>3D 结构预测</CardTitle>
                  <CardDescription>基于 ESMFold 的结构预测</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 p-8 rounded flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <div className="text-sm text-slate-600 mb-2">
                        3D 结构查看器 (需要 3Dmol.js)
                      </div>
                      <div className="text-xs text-slate-500">
                        置信度: {(visualization.structure3d?.confidence || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        方法: {visualization.structure3d?.method}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    注：完整的 3D 查看器需要集成 3Dmol.js 库。当前显示占位符。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-slate-500">无法加载可视化数据</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Property chart component
 */
function PropertyChart({
  title,
  values,
  color,
}: {
  title: string;
  values: number[];
  color: string;
}) {
  const maxValue = Math.max(...values.map(Math.abs), 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{title}</label>
      <div className="flex gap-0.5 items-end h-16 bg-slate-50 p-2 rounded">
        {values.map((value, i) => {
          const height = ((value - minValue) / range) * 100;
          return (
            <div
              key={i}
              className={`flex-1 ${color} opacity-70 hover:opacity-100 transition-opacity`}
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${i + 1}: ${value.toFixed(2)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
