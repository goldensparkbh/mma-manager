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
        subscriptionEnd: string;
    };
    sectionTitles: {
        personalInfo: string;
        healthNotes: string;
    };
    member: {
        name: string;
        memberId: string;
        phone: string;
        email: string;
        imageUrl?: string;
        subscriptionEnd: string;
    };
    memberInitials: string;
    status: string;
    statusLabel: string;
    summaryCards: { label: string; value: string }[];
    detailItems: { label: string; value: string }[];
    healthNotes: string;
    tableSections: { title: string; columns: string[]; rows: string[][]; emptyText: string }[];
};

const styles = StyleSheet.create({
    page: {
        padding: 24,
        backgroundColor: "#f2f5fb",
        color: "#090e1a",
        fontSize: 10,
    },
    pageRtl: {
        direction: "rtl",
    },
    header: {
        backgroundColor: "#090e1a",
        color: "#ffffff",
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerRtl: {
        flexDirection: "row-reverse",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerLeftRtl: {
        flexDirection: "row-reverse",
    },
    logo: {
        width: 46,
        height: 46,
        borderRadius: 10,
        backgroundColor: "#ffffff",
        padding: 4,
        marginRight: 10,
    },
    logoRtl: {
        marginRight: 0,
        marginLeft: 10,
    },
    logoPlaceholder: {
        width: 46,
        height: 46,
        borderRadius: 10,
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 700,
    },
    headerSubtitle: {
        fontSize: 10,
        color: "rgba(255,255,255,0.7)",
        marginTop: 2,
    },
    headerMeta: {
        alignItems: "flex-end",
    },
    headerMetaRtl: {
        alignItems: "flex-start",
    },
    metaPill: {
        backgroundColor: "rgba(255,255,255,0.18)",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        fontSize: 9,
        marginBottom: 4,
    },
    body: {
        marginTop: 16,
        flexDirection: "row",
    },
    bodyRtl: {
        flexDirection: "row-reverse",
    },
    summaryColumn: {
        flex: 1,
        minWidth: 0,
    },
    summaryColumnSpacing: {
        marginRight: 12,
    },
    summaryColumnSpacingRtl: {
        marginRight: 0,
        marginLeft: 12,
    },
    tableBody: {
        marginTop: 16,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e1e6f0",
        padding: 12,
    },
    cardSpacing: {
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: 700,
        marginBottom: 8,
        color: "#090e1a",
    },
    memberTop: {
        flexDirection: "row",
        alignItems: "center",
    },
    memberTopRtl: {
        flexDirection: "row-reverse",
    },
    memberAvatar: {
        width: 64,
        height: 64,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: "#e4e9f6",
    },
    memberAvatarRtl: {
        marginRight: 0,
        marginLeft: 10,
    },
    memberPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: "#e4e9f6",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    memberPlaceholderRtl: {
        marginRight: 0,
        marginLeft: 10,
    },
    memberName: {
        fontSize: 13,
        fontWeight: 700,
        color: "#090e1a",
    },
    memberId: {
        fontSize: 9,
        color: "#6b7280",
        marginTop: 2,
    },
    statusPill: {
        marginTop: 6,
        fontSize: 9,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        alignSelf: "flex-start",
        backgroundColor: "#e4e9f6",
        color: "#223f7a",
    },
    contactList: {
        marginTop: 10,
    },
    contactListRtl: {
        alignItems: "flex-end",
    },
    contactRow: {
        marginBottom: 4,
    },
    contactText: {
        fontSize: 9,
        color: "#2b3446",
    },
    statList: {},
    statItem: {
        backgroundColor: "#f4f6fb",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e1e6f0",
        padding: 8,
    },
    statLabel: {
        fontSize: 8,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    statValue: {
        fontSize: 12,
        fontWeight: 700,
        marginTop: 2,
        color: "#090e1a",
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    infoGridRtl: {
        flexDirection: "row-reverse",
    },
    infoItem: {
        width: "50%",
        paddingRight: 6,
        paddingBottom: 6,
    },
    infoItemRtl: {
        paddingRight: 0,
        paddingLeft: 6,
    },
    infoItemFull: {
        width: "100%",
    },
    infoBox: {
        backgroundColor: "#f4f6fb",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e1e6f0",
        padding: 8,
    },
    infoLabel: {
        fontSize: 8,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    infoValue: {
        fontSize: 10,
        fontWeight: 600,
        marginTop: 2,
        color: "#090e1a",
    },
    notes: {
        backgroundColor: "#f4f6fb",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e1e6f0",
        padding: 8,
        fontSize: 9,
        color: "#2b3446",
        lineHeight: 1.4,
    },
    table: {
        borderWidth: 1,
        borderColor: "#e1e6f0",
        borderRadius: 10,
        overflow: "hidden",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e1e6f0",
    },
    tableHeader: {
        backgroundColor: "#f4f6fb",
    },
    tableCell: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        fontSize: 8.5,
        color: "#2b3446",
    },
    tableHeaderCell: {
        fontSize: 8,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    tableEmpty: {
        padding: 10,
        textAlign: "center",
        fontSize: 9,
        color: "#6b7280",
    },
    textRtl: {
        textAlign: "right",
    },
});

const getInitials = (value: string) =>
    value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

const getStatusStyle = (status: string) => {
    switch (status) {
        case "active":
            return { backgroundColor: "rgba(34,197,94,0.18)", color: "#166534" };
        case "aboutToExpire":
            return { backgroundColor: "rgba(234,179,8,0.2)", color: "#92400e" };
        case "expired":
            return { backgroundColor: "rgba(239,68,68,0.18)", color: "#991b1b" };
        case "inactive":
            return { backgroundColor: "rgba(148,163,184,0.2)", color: "#475569" };
        default:
            return { backgroundColor: "#e4e9f6", color: "#223f7a" };
    }
};

export function MemberReportPdf({ data }: { data: MemberReportData }) {
    const isRtl = data.isRtl;
    const pageStyle = [
        styles.page,
        isRtl && styles.pageRtl,
        { fontFamily: isRtl ? "Cairo" : "NotoSans" },
    ];
    const textAlign = isRtl ? styles.textRtl : null;
    const detailItems = data.detailItems;
    const tableSections = data.tableSections.map((section) => ({
        ...section,
        columns: isRtl ? [...section.columns].reverse() : section.columns,
        rows: isRtl ? section.rows.map((row) => [...row].reverse()) : section.rows,
    }));
    const headerMetaItems = isRtl
        ? [
            `${data.labels.memberId}: ${data.member.memberId}`,
            `${data.labels.date}: ${data.reportDate}`,
        ]
        : [
            `${data.labels.date}: ${data.reportDate}`,
            `${data.labels.memberId}: ${data.member.memberId}`,
        ];
    const summaryColumnSpacing = isRtl ? styles.summaryColumnSpacingRtl : styles.summaryColumnSpacing;
    const keepTableTogetherThreshold = 8;
    const tableMinPresenceAhead = 120;
    const clubInitials = getInitials(data.clubName || data.reportTitle);
    const memberInitials = data.memberInitials || getInitials(data.member.name);
    const statusStyle = getStatusStyle(data.status);
    const header = (
        <View style={[styles.header, isRtl && styles.headerRtl]}>
            <View style={[styles.headerLeft, isRtl && styles.headerLeftRtl]}>
                {data.logoUrl ? (
                    <Image src={data.logoUrl} style={[styles.logo, isRtl && styles.logoRtl]} />
                ) : (
                    <View style={[styles.logoPlaceholder, isRtl && styles.logoRtl]}>
                        <Text>{clubInitials}</Text>
                    </View>
                )}
                <View>
                    <Text style={[styles.headerTitle, textAlign]}>{data.reportTitle}</Text>
                    <Text style={[styles.headerSubtitle, textAlign]}>{data.clubName}</Text>
                </View>
            </View>
            <View style={[styles.headerMeta, isRtl && styles.headerMetaRtl]}>
                {headerMetaItems.map((meta) => (
                    <Text key={meta} style={[styles.metaPill, textAlign]}>
                        {meta}
                    </Text>
                ))}
            </View>
        </View>
    );

    return (
        <Document title={data.reportFileName} author={data.clubName}>
            <Page size="A4" style={pageStyle}>
                {header}

                <View style={[styles.body, isRtl && styles.bodyRtl]}>
                    <View style={[styles.summaryColumn, summaryColumnSpacing]}>
                        <View style={[styles.card, styles.cardSpacing]} wrap={false}>
                            <View style={[styles.memberTop, isRtl && styles.memberTopRtl]}>
                                {data.member.imageUrl ? (
                                    <Image src={data.member.imageUrl} style={[styles.memberAvatar, isRtl && styles.memberAvatarRtl]} />
                                ) : (
                                    <View style={[styles.memberPlaceholder, isRtl && styles.memberPlaceholderRtl]}>
                                        <Text>{memberInitials}</Text>
                                    </View>
                                )}
                                <View>
                                    <Text style={[styles.memberName, textAlign]}>{data.member.name}</Text>
                                    <Text style={[styles.memberId, textAlign]}>#{data.member.memberId}</Text>
                                    <Text style={[styles.statusPill, statusStyle, isRtl && { alignSelf: "flex-end" }]}>
                                        {data.statusLabel}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.contactList, isRtl && styles.contactListRtl]}>
                                <Text style={[styles.contactText, styles.contactRow, textAlign]}>{`${data.labels.phone}: ${data.member.phone}`}</Text>
                                <Text style={[styles.contactText, styles.contactRow, textAlign]}>{`${data.labels.email}: ${data.member.email}`}</Text>
                                <Text style={[styles.contactText, textAlign]}>{`${data.labels.subscriptionEnd}: ${data.member.subscriptionEnd}`}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.summaryColumn, summaryColumnSpacing]}>
                        <View style={[styles.card, styles.cardSpacing]} wrap={false}>
                            <View style={styles.statList}>
                                {data.summaryCards.map((card, index) => (
                                    <View
                                        key={card.label}
                                        style={[
                                            styles.statItem,
                                            index < data.summaryCards.length - 1 ? { marginBottom: 6 } : null,
                                        ]}
                                    >
                                        <Text style={[styles.statLabel, textAlign]}>{card.label}</Text>
                                        <Text style={[styles.statValue, textAlign]}>{card.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.summaryColumn}>
                        <View style={[styles.card, styles.cardSpacing]} wrap={false}>
                            <Text style={[styles.cardTitle, textAlign]}>{data.sectionTitles.personalInfo}</Text>
                            <View style={[styles.infoGrid, isRtl && styles.infoGridRtl]}>
                                {detailItems.map((item) => (
                                    <View key={item.label} style={[styles.infoItem, styles.infoItemFull, isRtl && styles.infoItemRtl]}>
                                        <View style={styles.infoBox}>
                                            <Text style={[styles.infoLabel, textAlign]}>{item.label}</Text>
                                            <Text style={[styles.infoValue, textAlign]}>{item.value}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={[styles.card, styles.cardSpacing]} wrap={false}>
                            <Text style={[styles.cardTitle, textAlign]}>{data.sectionTitles.healthNotes}</Text>
                            <Text style={[styles.notes, textAlign]}>{data.healthNotes}</Text>
                        </View>
                    </View>
                </View>
            </Page>

            <Page size="A4" style={pageStyle}>
                {header}

                <View style={styles.tableBody}>
                    {tableSections.map((section, index) => {
                        const keepTogether = section.rows.length <= keepTableTogetherThreshold;
                        return (
                            <View
                                key={`${section.title}-${index}`}
                                style={[styles.card, styles.cardSpacing]}
                                wrap={!keepTogether}
                                minPresenceAhead={keepTogether ? 0 : tableMinPresenceAhead}
                            >
                            <Text style={[styles.cardTitle, textAlign]}>{section.title}</Text>
                            <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                    {section.columns.map((column) => (
                                        <Text key={column} style={[styles.tableCell, styles.tableHeaderCell, textAlign]}>
                                            {column}
                                        </Text>
                                    ))}
                                </View>
                                {section.rows.length ? (
                                    section.rows.map((row, rowIndex) => (
                                        <View
                                            key={`${section.title}-${rowIndex}`}
                                            style={[
                                                styles.tableRow,
                                                rowIndex === section.rows.length - 1 ? { borderBottomWidth: 0 } : null,
                                            ]}
                                        >
                                            {row.map((cell, cellIndex) => (
                                                <Text key={`${rowIndex}-${cellIndex}`} style={[styles.tableCell, textAlign]}>
                                                    {cell}
                                                </Text>
                                            ))}
                                        </View>
                                    ))
                                ) : (
                                    <Text style={[styles.tableEmpty, textAlign]}>{section.emptyText}</Text>
                                )}
                            </View>
                            </View>
                        );
                    })}
                </View>
            </Page>
        </Document>
    );
}
