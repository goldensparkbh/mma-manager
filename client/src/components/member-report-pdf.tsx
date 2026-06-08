import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
    family: "NotoSans",
    src: "https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNb4g.ttf",
});
Font.register({
    family: "Cairo",
    src: "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf",
});

export type MemberReportData = {
    isRtl: boolean;
    reportTitle: string;
    clubName: string;
    logoUrl: string;
    reportDate: string;
    reportFileName: string;
    labels: {
        date: string;
        memberId: string;
        phone: string;
        email: string;
        cpr: string;
        subscriptionEnd: string;
        dob: string;
        gender: string;
    };
    sectionTitles: {
        personalInfo: string;
        healthNotes: string;
        contactInfo: string;
        belts: string;
    };
    member: {
        name: string;
        memberId: string;
        cpr: string;
        phone: string;
        email: string;
        dob: string;
        gender: string;
        imageUrl?: string;
        subscriptionEnd: string;
    };
    memberInitials: string;
    status: string;
    statusLabel: string;
    summaryCards: { label: string; value: string }[];
    healthNotes: string;
    tableSections: { title: string; columns: string[]; rows: string[][]; emptyText: string }[];
    beltChain: {
        id: string;
        name: string;
        color: string;
        isEarned: boolean;
        awardedAt?: string;
    }[];
    financials: {
        subPaid: number;
        subUnpaid: number;
        salesPaid: number;
        salesUnpaid: number;
        totalPaidLabel: string;
        totalUnpaidLabel: string;
    };
};

const styles = StyleSheet.create({
    page: {
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "NotoSans",
        fontSize: 10,
        padding: 0,
    },
    pageRtl: {
        direction: "rtl",
    },
    container: {
        flexDirection: "row",
        height: "100%",
    },
    containerRtl: {
        flexDirection: "row-reverse",
    },
    // SIDEBAR
    sidebar: {
        width: "30%",
        backgroundColor: "#f8fafc",
        padding: 24,
        borderRightWidth: 1,
        borderRightColor: "#e2e8f0",
        height: "100%",
    },
    sidebarRtl: {
        borderRightWidth: 0,
        borderLeftWidth: 1,
        borderLeftColor: "#e2e8f0",
    },
    sidebarContent: {
        alignItems: "center",
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        objectFit: "cover",
        marginBottom: 16,
        borderWidth: 4,
        borderColor: "#ffffff",
        backgroundColor: "#e2e8f0",
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#cbd5e1",
        marginBottom: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 4,
        borderColor: "#ffffff",
    },
    initials: {
        fontSize: 32,
        color: "#ffffff",
        fontWeight: 700,
    },
    memberName: {
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 4,
        textAlign: "center",
        color: "#0f172a",
    },
    memberId: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 16,
        textAlign: "center",
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#e2e8f0",
        color: "#475569",
        fontSize: 10,
        fontWeight: 700,
        marginBottom: 32,
        alignSelf: "center",
    },
    statusActive: { backgroundColor: "#dcfce7", color: "#166534" },
    statusExpired: { backgroundColor: "#fee2e2", color: "#991b1b" },
    statusUpcoming: { backgroundColor: "#fef9c3", color: "#854d0e" },

    sectionTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: "#1e293b",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
        width: "100%",
        borderLeftWidth: 3,
        borderLeftColor: "#3b82f6",
        paddingLeft: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    sectionTitleRtl: {
        borderLeftWidth: 0,
        borderRightWidth: 3,
        borderRightColor: "#3b82f6",
        paddingLeft: 0,
        paddingRight: 8,
    },
    infoRow: {
        width: "100%",
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 9,
        color: "#64748b",
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 11,
        color: "#0f172a",
        fontWeight: 500,
    },
    // MAIN CONTENT
    main: {
        width: "70%",
        padding: 32,
        paddingTop: 40,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 32,
        borderBottomWidth: 2,
        borderBottomColor: "#f1f5f9",
        paddingBottom: 20,
    },
    headerRtl: {
        flexDirection: "row-reverse",
    },
    headerBrand: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerBrandRtl: {
        flexDirection: "row-reverse",
    },
    logo: {
        width: 32,
        height: 32,
        objectFit: "contain",
        marginRight: 10,
    },
    logoRtl: {
        marginRight: 0,
        marginLeft: 10,
    },
    clubName: {
        fontSize: 20,
        fontWeight: 800,
        color: "#0f172a",
    },
    reportTitle: {
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
    },
    meta: {
        alignItems: "flex-end",
    },
    metaRtl: {
        alignItems: "flex-start",
    },
    metaText: {
        fontSize: 9,
        color: "#94a3b8",
        marginBottom: 2,
    },

    // STATS GRID
    statsGrid: {
        flexDirection: "row",
        marginBottom: 32,
        gap: 12,
    },
    statsGridRtl: {
        flexDirection: "row-reverse",
    },
    statCard: {
        flex: 1,
        backgroundColor: "#f8fafc",
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    statLabel: {
        fontSize: 9,
        color: "#64748b",
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 700,
        color: "#0f172a",
    },

    // HEALTH NOTES
    notesBox: {
        backgroundColor: "#fff7ed",
        borderLeftWidth: 4,
        borderLeftColor: "#f97316",
        padding: 12,
        marginBottom: 32,
        borderRadius: 4,
    },
    notesBoxRtl: {
        borderLeftWidth: 0,
        borderRightWidth: 4,
        borderRightColor: "#f97316",
    },
    notesTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: "#9a3412",
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#f97316",
        paddingLeft: 8,
    },
    notesText: {
        fontSize: 10,
        color: "#7c2d12",
        lineHeight: 1.5,
    },

    // TABLES
    tableSection: {
        marginBottom: 24,
    },
    tableTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: "#1e293b",
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: "#3b82f6",
        paddingLeft: 8,
    },
    table: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 6,
        overflow: "hidden",
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    tableHeaderRtl: {
        flexDirection: "row-reverse",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    tableRowRtl: {
        flexDirection: "row-reverse",
    },
    th: {
        flex: 1,
        padding: 8,
        fontSize: 9,
        fontWeight: 700,
        color: "#475569",
        textAlign: "left",
    },
    thRtl: {
        textAlign: "right",
    },
    td: {
        flex: 1,
        padding: 8,
        fontSize: 9,
        color: "#334155",
        textAlign: "left",
    },
    tdRtl: {
        textAlign: "right",
    },
    noData: {
        padding: 12,
        fontSize: 9,
        color: "#94a3b8",
        textAlign: "center",
        //     fontStyle: "italic", // Removed to fix Cairo font resolution error
    },
    textRight: {
        textAlign: "right",
    },
    // BELT CHAIN
    beltChainContainer: {
        marginTop: 24,
        marginBottom: 40,
        padding: 16,
        backgroundColor: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    beltChainTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: "#1e293b",
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: "#3b82f6",
        paddingLeft: 8,
    },
    beltChainList: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        width: "100%",
    },
    beltChainListRtl: {
        flexDirection: "row-reverse",
    },
    beltItem: {
        alignItems: "center",
        width: "18%",
        marginBottom: 16,
    },
    beltCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#cbd5e1",
        marginBottom: 6,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        flexGrow: 0,
    },
    beltName: {
        fontSize: 8,
        fontWeight: 700,
        textAlign: "center",
        color: "#1e293b",
    },
    beltDate: {
        fontSize: 6,
        color: "#64748b",
        textAlign: "center",
        marginTop: 1,
    },
    checkMark: {
        fontSize: 10,
        color: "#ffffff",
    },
    // FINANCE SUMMARY
    financeSummary: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 16,
        marginTop: 8,
        padding: 8,
        backgroundColor: "#f8fafc",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    financeSummaryRtl: {
        flexDirection: "row-reverse",
    },
    financeItem: {
        alignItems: "flex-end",
    },
    financeItemRtl: {
        alignItems: "flex-start",
    },
    financeLabel: {
        fontSize: 7,
        color: "#64748b",
        textTransform: "uppercase",
        fontWeight: 700,
        marginBottom: 2,
    },
    financeValue: {
        fontSize: 9,
        fontWeight: 700,
        color: "#1e293b",
    },
    paid: { color: "#166534" },
    unpaid: { color: "#991b1b" },
});

export function MemberReportPdf({ data }: { data: MemberReportData }) {
    const isRtl = data.isRtl;
    const fontFamily = isRtl ? "Cairo" : "NotoSans";

    const getStatusStyle = (status: string) => {
        if (status === "active") return styles.statusActive;
        if (status === "expired") return styles.statusExpired;
        if (status === "upcoming") return styles.statusUpcoming;
        return {};
    };

    return (
        <Document title={data.reportFileName} author={data.clubName}>
            <Page size="A4" style={[styles.page, isRtl ? styles.pageRtl : {}, { fontFamily }]}>
                <View style={[styles.container, isRtl ? styles.containerRtl : {}]}>

                    {/* SIDEBAR */}
                    <View style={[styles.sidebar, isRtl ? styles.sidebarRtl : {}]}>
                        <View style={styles.sidebarContent}>
                            {data.member.imageUrl ? (
                                <Image src={data.member.imageUrl} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.initials}>{data.memberInitials}</Text>
                                </View>
                            )}

                            <Text style={styles.memberName}>{data.member.name}</Text>
                            <Text style={styles.memberId}>#{data.member.memberId}</Text>

                            <Text style={[styles.statusBadge, getStatusStyle(data.status)]}>
                                {data.statusLabel}
                            </Text>

                            <View style={[styles.sectionTitle, isRtl ? styles.sectionTitleRtl : {}]}>
                                <Text>{data.sectionTitles.contactInfo}</Text>
                            </View>

                            {data.member.cpr && (
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, isRtl ? styles.textRight : {}]}>{data.labels.cpr}</Text>
                                    <Text style={[styles.infoValue, isRtl ? styles.textRight : {}]}>{data.member.cpr}</Text>
                                </View>
                            )}

                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, isRtl ? styles.textRight : {}]}>{data.labels.phone}</Text>
                                <Text style={[styles.infoValue, isRtl ? styles.textRight : {}]}>{data.member.phone}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, isRtl ? styles.textRight : {}]}>{data.labels.email}</Text>
                                <Text style={[styles.infoValue, isRtl ? styles.textRight : {}]}>{data.member.email}</Text>
                            </View>

                            {data.member.dob && (
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, isRtl ? styles.textRight : {}]}>{data.labels.dob}</Text>
                                    <Text style={[styles.infoValue, isRtl ? styles.textRight : {}]}>{data.member.dob}</Text>
                                </View>
                            )}

                            {data.member.gender && (
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, isRtl ? styles.textRight : {}]}>{data.labels.gender}</Text>
                                    <Text style={[styles.infoValue, isRtl ? styles.textRight : {}]}>{data.member.gender}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* MAIN CONTENT */}
                    <View style={styles.main}>

                        {/* Header */}
                        <View style={[styles.header, isRtl ? styles.headerRtl : {}]}>
                            <View style={[styles.headerBrand, isRtl ? styles.headerBrandRtl : {}]}>
                                {data.logoUrl && <Image src={data.logoUrl} style={[styles.logo, isRtl ? styles.logoRtl : {}]} />}
                                <View>
                                    <Text style={[styles.clubName, isRtl ? styles.textRight : {}]}>{data.clubName}</Text>
                                    <Text style={[styles.reportTitle, isRtl ? styles.textRight : {}]}>{data.reportTitle}</Text>
                                </View>
                            </View>
                            <View style={[styles.meta, isRtl ? styles.metaRtl : {}]}>
                                <Text style={styles.metaText}>{data.labels.date}: {data.reportDate}</Text>
                                <Text style={styles.metaText}>{data.labels.memberId}: {data.member.memberId}</Text>
                            </View>
                        </View>

                        {/* Summary Stats */}
                        <View style={[styles.statsGrid, isRtl ? styles.statsGridRtl : {}]}>
                            {data.summaryCards.map((card, i) => (
                                <View key={i} style={styles.statCard}>
                                    <Text style={[styles.statLabel, isRtl ? styles.textRight : {}]}>{card.label}</Text>
                                    <Text style={[styles.statValue, isRtl ? styles.textRight : {}]}>{card.value}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Belt Chain */}
                        {data.beltChain && data.beltChain.length > 0 && (
                            <View style={styles.beltChainContainer} wrap={false}>
                                <Text style={[styles.beltChainTitle, isRtl ? styles.sectionTitleRtl : {}, isRtl ? styles.textRight : {}]}>{data.sectionTitles.belts}</Text>
                                {(() => {
                                    const rows = [];
                                    const itemsPerRow = 5;
                                    for (let i = 0; i < data.beltChain.length; i += itemsPerRow) {
                                        rows.push(data.beltChain.slice(i, i + itemsPerRow));
                                    }
                                    return rows.map((row, rowIdx) => (
                                        <View key={rowIdx} style={[styles.beltChainList, isRtl ? styles.beltChainListRtl : {}, { marginBottom: 10 }]}>
                                            {row.map((belt) => (
                                                <View key={belt.id} style={styles.beltItem}>
                                                    <View
                                                        style={[
                                                            styles.beltCircle,
                                                            {
                                                                backgroundColor: belt.isEarned ? belt.color : "#f1f5f9",
                                                                borderColor: "#cbd5e1"
                                                            }
                                                        ]}
                                                    >
                                                        {belt.isEarned && <Text style={styles.checkMark}>✓</Text>}
                                                    </View>
                                                    <Text style={styles.beltName}>{belt.name}</Text>
                                                    {belt.awardedAt && (
                                                        <Text style={styles.beltDate}>{belt.awardedAt}</Text>
                                                    )}
                                                </View>
                                            ))}
                                            {/* Fill remaining slots to maintain alignment */}
                                            {row.length < itemsPerRow && Array.from({ length: itemsPerRow - row.length }).map((_, i) => (
                                                <View key={`empty-${i}`} style={styles.beltItem} />
                                            ))}
                                        </View>
                                    ));
                                })()}
                            </View>
                        )}

                        {/* Health Notes */}
                        {data.healthNotes && data.healthNotes !== "No results" && data.healthNotes !== "لا توجد نتائج" && (
                            <View style={[styles.notesBox, isRtl ? styles.notesBoxRtl : {}]}>
                                <Text style={[styles.notesTitle, isRtl ? styles.sectionTitleRtl : {}, isRtl ? styles.textRight : {}]}>{data.sectionTitles.healthNotes}</Text>
                                <Text style={[styles.notesText, isRtl ? styles.textRight : {}]}>{data.healthNotes}</Text>
                            </View>
                        )}

                        {/* Tables */}
                        {data.tableSections.map((section, idx) => (
                            <View key={idx} style={styles.tableSection} wrap={false}>
                                <Text style={[styles.tableTitle, isRtl ? styles.sectionTitleRtl : {}, isRtl ? styles.textRight : {}]}>{section.title}</Text>
                                <View style={styles.table}>
                                    {/* Header */}
                                    <View style={[styles.tableHeader, isRtl ? styles.tableHeaderRtl : {}]}>
                                        {section.columns.map((col, i) => (
                                            <Text key={i} style={[styles.th, isRtl ? styles.thRtl : {}]}>{col}</Text>
                                        ))}
                                    </View>
                                    {/* Rows */}
                                    {section.rows.length > 0 ? (
                                        section.rows.map((row, rIdx) => (
                                            <View key={rIdx} style={[styles.tableRow, isRtl ? styles.tableRowRtl : {}]}>
                                                {row.map((cell, cIdx) => (
                                                    <Text key={cIdx} style={[styles.td, isRtl ? styles.tdRtl : {}]}>{cell}</Text>
                                                ))}
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.noData}>{section.emptyText}</Text>
                                    )}
                                </View>

                                {/* Financial Summaries for Tables */}
                                {(section.title === data.tableSections[0].title || section.title === data.tableSections[3].title) && (
                                    <View style={[styles.financeSummary, data.isRtl ? styles.financeSummaryRtl : {}]}>
                                        <View style={[styles.financeItem, data.isRtl ? styles.financeItemRtl : {}]}>
                                            <Text style={styles.financeLabel}>
                                                {data.financials.totalPaidLabel}
                                            </Text>
                                            <Text style={[styles.financeValue, styles.paid]}>
                                                {section.title === data.tableSections[0].title
                                                    ? `${data.financials.subPaid.toFixed(3)} BHD`
                                                    : `${data.financials.salesPaid.toFixed(3)} BHD`}
                                            </Text>
                                        </View>
                                        <View style={[styles.financeItem, data.isRtl ? styles.financeItemRtl : {}]}>
                                            <Text style={styles.financeLabel}>
                                                {data.financials.totalUnpaidLabel}
                                            </Text>
                                            <Text style={[styles.financeValue, styles.unpaid]}>
                                                {section.title === data.tableSections[0].title
                                                    ? `${data.financials.subUnpaid.toFixed(3)} BHD`
                                                    : `${data.financials.salesUnpaid.toFixed(3)} BHD`}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))}

                        {/* Financial Summaries for Tables */}
                        {/* We need to inject these specifically after Subscriptions and Sales */}
                        {/* I will modify the map above to handle this logic or just add a final summary if needed */}
                        {/* Actually, user wants it for BOTH. I will adjust the table rendering loop */}

                    </View>
                </View>
            </Page>
        </Document>
    );
}
